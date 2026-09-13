package com.pulsopiura.platform.reservations.application.port;

import com.pulsopiura.platform.reservations.domain.Reservation;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ReservationStore {
    Reservation save(Reservation reservation);

    Optional<Reservation> findById(UUID reservationId);

    Optional<Reservation> findByIdForUpdate(UUID reservationId);

    Optional<Reservation> findByCustomerAndIdempotencyKey(UUID customerUserId, String key);

    void lockCustomerReservationCreation(UUID customerUserId);

    long countActiveTemporaryByCustomer(UUID customerUserId, Instant now);

    List<Reservation> findExpiredOverlappingHoldsForUpdate(
            UUID sportSpaceId, Instant startsAt, Instant endsAt, Instant now);

    List<Reservation> findBlocking(
            UUID sportSpaceId, Instant startsAt, Instant endsAt, Instant now);

    List<Reservation> findByCustomer(UUID customerUserId, int page, int size);

    long countByCustomer(UUID customerUserId);

    List<OrganizationReservationRow> findByOrganization(UUID organizationId, int page, int size);

    long countByOrganization(UUID organizationId);

    record OrganizationReservationRow(
            UUID id,
            UUID sportSpaceId,
            String spaceName,
            String venueName,
            UUID customerUserId,
            String customerEmail,
            Instant startsAt,
            Instant endsAt,
            String status,
            long totalMinor,
            long depositMinor,
            String currency,
            Instant expiresAt) {}
}
