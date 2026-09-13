package com.pulsopiura.platform.reservations.infrastructure.persistence;

import com.pulsopiura.platform.reservations.application.port.ReservationStore;
import com.pulsopiura.platform.reservations.domain.Reservation;
import com.pulsopiura.platform.reservations.domain.ReservationStatus;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.PreparedStatementCallback;
import org.springframework.stereotype.Repository;

@Repository
class JpaReservationStore implements ReservationStore {
    private final ReservationJpaRepository reservations;
    private final JdbcTemplate jdbc;

    JpaReservationStore(ReservationJpaRepository reservations, JdbcTemplate jdbc) {
        this.reservations = reservations;
        this.jdbc = jdbc;
    }

    @Override
    public Reservation save(Reservation reservation) {
        return reservations.saveAndFlush(ReservationJpaEntity.fromDomain(reservation)).toDomain();
    }

    @Override
    public Optional<Reservation> findById(UUID reservationId) {
        return reservations.findById(reservationId).map(ReservationJpaEntity::toDomain);
    }

    @Override
    public Optional<Reservation> findByIdForUpdate(UUID id) {
        return reservations.findByIdForUpdate(id).map(ReservationJpaEntity::toDomain);
    }

    @Override
    public List<Reservation> findBlocking(UUID spaceId, Instant start, Instant end, Instant now) {
        return reservations
                .findBlocking(
                        spaceId,
                        start,
                        end,
                        now,
                        ReservationStatus.CONFIRMED,
                        List.of(ReservationStatus.HOLD, ReservationStatus.PENDING_PAYMENT))
                .stream()
                .map(ReservationJpaEntity::toDomain)
                .toList();
    }

    @Override
    public List<Reservation> findByCustomer(UUID userId, int page, int size) {
        return reservations
                .findVisibleByCustomerUserId(
                        userId,
                        List.of(ReservationStatus.CONFIRMED, ReservationStatus.COMPLETED),
                        List.of(ReservationStatus.HOLD, ReservationStatus.PENDING_PAYMENT),
                        "PAID",
                        PageRequest.of(page, size))
                .stream()
                .map(ReservationJpaEntity::toDomain)
                .toList();
    }

    @Override
    public long countByCustomer(UUID userId) {
        return reservations.countVisibleByCustomerUserId(
                userId,
                List.of(ReservationStatus.CONFIRMED, ReservationStatus.COMPLETED),
                List.of(ReservationStatus.HOLD, ReservationStatus.PENDING_PAYMENT),
                "PAID");
    }

    @Override
    public List<ReservationStore.OrganizationReservationRow> findByOrganization(
            UUID organizationId, int page, int size) {
        return reservations
                .findAllByOrganizationId(organizationId, PageRequest.of(page, size))
                .stream()
                .map(
                        row ->
                                new ReservationStore.OrganizationReservationRow(
                                        row.getId(),
                                        row.getSportSpaceId(),
                                        row.getSpaceName(),
                                        row.getVenueName(),
                                        row.getCustomerUserId(),
                                        row.getCustomerEmail(),
                                        row.getStartsAt(),
                                        row.getEndsAt(),
                                        row.getStatus(),
                                        row.getTotalMinor(),
                                        row.getDepositMinor(),
                                        row.getCurrency(),
                                        row.getExpiresAt()))
                .toList();
    }

    @Override
    public long countByOrganization(UUID organizationId) {
        return reservations.countByOrganizationId(organizationId);
    }

    @Override
    public Optional<Reservation> findByCustomerAndIdempotencyKey(UUID customerUserId, String key) {
        return reservations
                .findByCustomerUserIdAndIdempotencyKey(customerUserId, key)
                .map(ReservationJpaEntity::toDomain);
    }

    @Override
    public void lockCustomerReservationCreation(UUID customerUserId) {
        jdbc.execute(
                "select pg_advisory_xact_lock(hashtextextended(cast(? as text), 0))",
                (PreparedStatementCallback<Void>)
                        statement -> {
                            statement.setString(1, customerUserId.toString());
                            statement.execute();
                            return null;
                        });
    }

    @Override
    public long countActiveTemporaryByCustomer(UUID customerUserId, Instant now) {
        return reservations.countActiveTemporaryByCustomerUserId(
                customerUserId,
                List.of(ReservationStatus.HOLD, ReservationStatus.PENDING_PAYMENT),
                now);
    }

    @Override
    public List<Reservation> findExpiredOverlappingHoldsForUpdate(
            UUID sportSpaceId, Instant startsAt, Instant endsAt, Instant now) {
        return reservations
                .findExpiredOverlappingHoldsForUpdate(
                        sportSpaceId,
                        List.of(ReservationStatus.HOLD, ReservationStatus.PENDING_PAYMENT),
                        startsAt,
                        endsAt,
                        now)
                .stream()
                .map(ReservationJpaEntity::toDomain)
                .toList();
    }
}
