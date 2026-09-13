package com.pulsopiura.platform.reservations.application;

import com.pulsopiura.platform.organizations.application.OrganizationAuthorization;
import com.pulsopiura.platform.organizations.domain.OrganizationPermission;
import com.pulsopiura.platform.organizations.domain.OrganizationRole;
import com.pulsopiura.platform.reservations.application.port.ReservationCheckInDetailsQuery;
import com.pulsopiura.platform.reservations.application.port.ReservationCheckInPassStore;
import com.pulsopiura.platform.reservations.application.port.ReservationHistoryStore;
import com.pulsopiura.platform.reservations.application.port.ReservationPaymentQuery;
import com.pulsopiura.platform.reservations.application.port.ReservationStore;
import com.pulsopiura.platform.reservations.domain.ReservationStatus;
import com.pulsopiura.platform.reservations.domain.ReservationStatusTransition;
import com.pulsopiura.platform.reservations.domain.ReservationTransitionActor;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReservationCheckInService {
    private static final String PAYLOAD_PREFIX = "PULSO-CHECKIN:";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final ReservationStore reservations;
    private final ReservationCheckInPassStore passes;
    private final ReservationCheckInDetailsQuery details;
    private final ReservationPaymentQuery payments;
    private final ReservationHistoryStore history;
    private final OrganizationAuthorization organizations;
    private final Clock clock;
    private final Supplier<String> tokenSupplier;

    @Autowired
    public ReservationCheckInService(
            ReservationStore reservations,
            ReservationCheckInPassStore passes,
            ReservationCheckInDetailsQuery details,
            ReservationPaymentQuery payments,
            ReservationHistoryStore history,
            OrganizationAuthorization organizations) {
        this(
                reservations,
                passes,
                details,
                payments,
                history,
                organizations,
                Clock.systemUTC(),
                ReservationCheckInService::newToken);
    }

    ReservationCheckInService(
            ReservationStore reservations,
            ReservationCheckInPassStore passes,
            ReservationCheckInDetailsQuery details,
            ReservationPaymentQuery payments,
            ReservationHistoryStore history,
            OrganizationAuthorization organizations,
            Clock clock,
            Supplier<String> tokenSupplier) {
        this.reservations = reservations;
        this.passes = passes;
        this.details = details;
        this.payments = payments;
        this.history = history;
        this.organizations = organizations;
        this.clock = clock;
        this.tokenSupplier = tokenSupplier;
    }

    @Transactional
    public CheckInPass issue(UUID actor, UUID reservationId) {
        var reservation = lock(reservationId);
        if (!reservation.customerUserId().equals(actor)) {
            throw new NoSuchElementException("Reserva no encontrada");
        }
        if (reservation.status() != ReservationStatus.CONFIRMED) {
            throw new ReservationConflictException(
                    "El QR se habilita cuando la reserva está confirmada");
        }
        var now = clock.instant();
        var validUntil = reservation.timeRange().endsAt().plusSeconds(12 * 60 * 60);
        if (!now.isBefore(validUntil)) {
            throw new ReservationConflictException("La vigencia de esta reserva ya terminó");
        }
        var token = tokenSupplier.get();
        passes.issue(reservation.id(), reservation.organizationId(), hash(token), now, validUntil);
        return new CheckInPass(
                reservation.id(), PAYLOAD_PREFIX + token, now, validUntil, reservation.version());
    }

    @Transactional(readOnly = true)
    public CheckInReservation preview(UUID actor, UUID organizationId, String payload) {
        var resolved = resolve(actor, organizationId, payload);
        return view(resolved.pass(), resolved.reservation());
    }

    @Transactional
    public CheckInReservation checkIn(
            UUID actor, UUID organizationId, String payload, String correlationId) {
        var tokenHash = hash(extractToken(payload));
        var initialPass =
                passes.findByTokenHash(tokenHash)
                        .orElseThrow(() -> new NoSuchElementException("QR de reserva no válido"));
        requireOwner(actor, organizationId, initialPass.organizationId());
        var reservation = lock(initialPass.reservationId());
        var pass =
                passes.findByTokenHash(tokenHash)
                        .orElseThrow(() -> new NoSuchElementException("QR de reserva no válido"));

        if (reservation.status() == ReservationStatus.COMPLETED) {
            if (pass.consumedAt() != null) return view(pass, reservation);
            throw new ReservationConflictException("La reserva ya fue completada");
        }
        validateUsable(pass, reservation);
        var now = clock.instant();
        var previous = reservation.status();
        reservation.complete(now);
        var saved = reservations.save(reservation);
        if (!passes.consume(tokenHash, actor, now)) {
            throw new ReservationConflictException("Este QR ya fue utilizado");
        }
        history.append(
                new ReservationStatusTransition(
                        saved.organizationId(),
                        saved.id(),
                        previous,
                        saved.status(),
                        ReservationTransitionActor.USER,
                        actor,
                        "CUSTOMER_CHECKED_IN",
                        correlationId,
                        now));
        var consumed =
                new ReservationCheckInPassStore.PassRecord(
                        pass.reservationId(), pass.organizationId(), pass.validUntil(), now, actor);
        return view(consumed, saved);
    }

    private ResolvedPass resolve(UUID actor, UUID organizationId, String payload) {
        var pass =
                passes.findByTokenHash(hash(extractToken(payload)))
                        .orElseThrow(() -> new NoSuchElementException("QR de reserva no válido"));
        requireOwner(actor, organizationId, pass.organizationId());
        var reservation =
                reservations
                        .findById(pass.reservationId())
                        .orElseThrow(() -> new NoSuchElementException("Reserva no encontrada"));
        validateUsable(pass, reservation);
        return new ResolvedPass(pass, reservation);
    }

    private void requireOwner(UUID actor, UUID requestedOrganizationId, UUID passOrganizationId) {
        if (!requestedOrganizationId.equals(passOrganizationId)) {
            throw new NoSuchElementException("QR de reserva no válido");
        }
        if (organizations.require(actor, requestedOrganizationId, OrganizationPermission.OPERATE)
                != OrganizationRole.OWNER) {
            throw new AccessDeniedException("Solo el dueño puede registrar la llegada");
        }
    }

    private void validateUsable(
            ReservationCheckInPassStore.PassRecord pass,
            com.pulsopiura.platform.reservations.domain.Reservation reservation) {
        if (!reservation.organizationId().equals(pass.organizationId())) {
            throw new NoSuchElementException("QR de reserva no válido");
        }
        if (pass.consumedAt() != null && reservation.status() != ReservationStatus.COMPLETED) {
            throw new ReservationConflictException("Este QR ya fue utilizado");
        }
        if (clock.instant().isAfter(pass.validUntil())) {
            throw new ReservationConflictException("El QR de la reserva venció");
        }
        if (reservation.status() != ReservationStatus.CONFIRMED
                && reservation.status() != ReservationStatus.COMPLETED) {
            throw new ReservationConflictException("La reserva no admite registro de llegada");
        }
    }

    private CheckInReservation view(
            ReservationCheckInPassStore.PassRecord pass,
            com.pulsopiura.platform.reservations.domain.Reservation reservation) {
        var names = details.get(reservation.id());
        var paidMinor = payments.paidMinor(reservation.id());
        var balanceMinor = Math.max(0, reservation.total().minor() - paidMinor);
        return new CheckInReservation(
                reservation.id(),
                names.venueName(),
                names.spaceName(),
                names.customerName(),
                names.customerEmail(),
                reservation.timeRange().startsAt(),
                reservation.timeRange().endsAt(),
                reservation.status().name(),
                reservation.total().minor(),
                paidMinor,
                balanceMinor,
                reservation.total().currency(),
                balanceMinor == 0 ? "PAID" : paidMinor > 0 ? "PARTIAL" : "PENDING",
                pass.consumedAt());
    }

    private com.pulsopiura.platform.reservations.domain.Reservation lock(UUID reservationId) {
        return reservations
                .findByIdForUpdate(reservationId)
                .orElseThrow(() -> new NoSuchElementException("Reserva no encontrada"));
    }

    private static String extractToken(String payload) {
        if (payload == null) throw new IllegalArgumentException("El QR es obligatorio");
        var value = payload.trim();
        if (value.startsWith(PAYLOAD_PREFIX)) value = value.substring(PAYLOAD_PREFIX.length());
        if (!value.matches("[A-Za-z0-9_-]{43}")) {
            throw new IllegalArgumentException("El QR no tiene un formato válido");
        }
        return value;
    }

    private static String hash(String token) {
        try {
            return HexFormat.of()
                    .formatHex(
                            MessageDigest.getInstance("SHA-256")
                                    .digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 no está disponible", impossible);
        }
    }

    private static String newToken() {
        var bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private record ResolvedPass(
            ReservationCheckInPassStore.PassRecord pass,
            com.pulsopiura.platform.reservations.domain.Reservation reservation) {}

    public record CheckInPass(
            UUID reservationId,
            String payload,
            Instant issuedAt,
            Instant validUntil,
            long reservationVersion) {}

    public record CheckInReservation(
            UUID reservationId,
            String venueName,
            String spaceName,
            String customerName,
            String customerEmail,
            Instant startsAt,
            Instant endsAt,
            String reservationStatus,
            long totalMinor,
            long paidMinor,
            long balanceMinor,
            String currency,
            String paymentStatus,
            Instant checkedInAt) {}
}
