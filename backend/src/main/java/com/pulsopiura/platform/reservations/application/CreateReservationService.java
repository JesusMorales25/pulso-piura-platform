package com.pulsopiura.platform.reservations.application;

import com.pulsopiura.platform.reservations.application.port.ReservationStore;
import com.pulsopiura.platform.reservations.domain.*;
import com.pulsopiura.platform.reservations.infrastructure.config.ReservationProperties;
import com.pulsopiura.platform.venues.application.SlotNotBookableException;
import com.pulsopiura.platform.venues.application.VenueSlotQuoteQuery;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

@Service
public class CreateReservationService {
    private final ReservationStore reservations;
    private final ReservationCreationTransaction creationTransaction;
    private final VenueSlotQuoteQuery venueSlots;
    private final ReservationProperties properties;
    private final Clock clock;

    @Autowired
    public CreateReservationService(
            ReservationStore reservations,
            ReservationCreationTransaction creationTransaction,
            VenueSlotQuoteQuery venueSlots,
            ReservationProperties properties) {
        this(reservations, creationTransaction, venueSlots, properties, Clock.systemUTC());
    }

    CreateReservationService(
            ReservationStore reservations,
            ReservationCreationTransaction creationTransaction,
            VenueSlotQuoteQuery venueSlots,
            ReservationProperties properties,
            Clock clock) {
        this.reservations = reservations;
        this.creationTransaction = creationTransaction;
        this.venueSlots = venueSlots;
        this.properties = properties;
        this.clock = clock;
    }

    public CreationResult create(
            UUID customerUserId,
            UUID sportSpaceId,
            Instant startsAt,
            Instant endsAt,
            String rawIdempotencyKey,
            String correlationId) {
        var key = new ReservationIdempotencyKey(rawIdempotencyKey);
        var range = new ReservationTimeRange(startsAt, endsAt);
        var fingerprint =
                ReservationRequestFingerprint.calculate(
                        sportSpaceId, range.startsAt(), range.endsAt());
        var previous = reservations.findByCustomerAndIdempotencyKey(customerUserId, key.value());
        if (previous.isPresent()) return replay(previous.get(), fingerprint);

        var now = clock.instant();
        if (!range.startsAt().isAfter(now)) {
            throw new SlotNotBookableException("No se puede reservar una franja pasada");
        }
        var quote = venueSlots.requireBookableSlot(sportSpaceId, startsAt, endsAt);
        var candidate =
                Reservation.hold(
                        quote.organizationId(),
                        quote.sportSpaceId(),
                        customerUserId,
                        range,
                        ReservationMoney.pen(quote.priceMinor()),
                        ReservationMoney.pen(
                                quote.priceMinor() / 4 + (quote.priceMinor() % 4 == 0 ? 0 : 1)),
                        now.plus(properties.holdDuration()).isBefore(startsAt)
                                ? now.plus(properties.holdDuration())
                                : startsAt,
                        key,
                        fingerprint,
                        now);
        try {
            return new CreationResult(
                    ReservationView.from(
                            creationTransaction.create(
                                    candidate, customerUserId, correlationId, now)),
                    false);
        } catch (DataIntegrityViolationException conflict) {
            var concurrent =
                    reservations.findByCustomerAndIdempotencyKey(customerUserId, key.value());
            if (concurrent.isPresent()) return replay(concurrent.get(), fingerprint);
            throw new ReservationConflictException("La franja ya no está disponible");
        }
    }

    private CreationResult replay(Reservation reservation, String fingerprint) {
        if (!reservation.requestFingerprint().equals(fingerprint)) {
            throw new ReservationConflictException(
                    "Idempotency-Key ya fue utilizada con otra solicitud");
        }
        return new CreationResult(ReservationView.from(reservation), true);
    }

    public record CreationResult(ReservationView reservation, boolean replayed) {}
}
