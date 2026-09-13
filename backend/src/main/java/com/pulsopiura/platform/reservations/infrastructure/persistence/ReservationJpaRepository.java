package com.pulsopiura.platform.reservations.infrastructure.persistence;

import com.pulsopiura.platform.reservations.domain.ReservationStatus;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface ReservationJpaRepository extends JpaRepository<ReservationJpaEntity, UUID> {
    Optional<ReservationJpaEntity> findByCustomerUserIdAndIdempotencyKey(
            UUID customerUserId, String idempotencyKey);

    @Query(
            """
            select count(reservation) from ReservationJpaEntity reservation
            where reservation.customerUserId = :customerUserId
              and reservation.status in :statuses
              and reservation.expiresAt > :now
            """)
    long countActiveTemporaryByCustomerUserId(
            @Param("customerUserId") UUID customerUserId,
            @Param("statuses") List<ReservationStatus> statuses,
            @Param("now") Instant now);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from ReservationJpaEntity r where r.id = :id")
    Optional<ReservationJpaEntity> findByIdForUpdate(@Param("id") UUID id);

    @Query(
            """
            select reservation from ReservationJpaEntity reservation
            where reservation.customerUserId = :customerUserId
              and (
                reservation.status in :finalStatuses
                or (reservation.status in :temporaryStatuses and reservation.expiresAt > CURRENT_TIMESTAMP)
                or exists (
                  select payment.id from PaymentOrderEntity payment
                  where payment.reservationId = reservation.id and payment.status = :paidStatus
                )
              )
            order by reservation.createdAt desc
            """)
    List<ReservationJpaEntity> findVisibleByCustomerUserId(
            @Param("customerUserId") UUID customerUserId,
            @Param("finalStatuses") List<ReservationStatus> finalStatuses,
            @Param("temporaryStatuses") List<ReservationStatus> temporaryStatuses,
            @Param("paidStatus") String paidStatus,
            Pageable pageable);

    @Query(
            """
            select count(reservation) from ReservationJpaEntity reservation
            where reservation.customerUserId = :customerUserId
              and (
                reservation.status in :finalStatuses
                or (reservation.status in :temporaryStatuses and reservation.expiresAt > CURRENT_TIMESTAMP)
                or exists (
                  select payment.id from PaymentOrderEntity payment
                  where payment.reservationId = reservation.id and payment.status = :paidStatus
                )
              )
            """)
    long countVisibleByCustomerUserId(
            @Param("customerUserId") UUID customerUserId,
            @Param("finalStatuses") List<ReservationStatus> finalStatuses,
            @Param("temporaryStatuses") List<ReservationStatus> temporaryStatuses,
            @Param("paidStatus") String paidStatus);

    @Query(
            "select r.id as id, r.sportSpaceId as sportSpaceId, s.name as spaceName, v.name as venueName, r.customerUserId as customerUserId, u.email as customerEmail, r.startsAt as startsAt, r.endsAt as endsAt, r.status as status, r.totalMinor as totalMinor, r.depositMinor as depositMinor, r.currency as currency, r.expiresAt as expiresAt from ReservationJpaEntity r join com.pulsopiura.platform.venues.infrastructure.persistence.SportSpaceEntity s on s.id = r.sportSpaceId join com.pulsopiura.platform.venues.infrastructure.persistence.VenueEntity v on v.id = s.venueId join com.pulsopiura.platform.identity.infrastructure.persistence.UserEntity u on u.id = r.customerUserId where r.organizationId = :organizationId order by r.startsAt desc")
    List<OrganizationReservationProjection> findAllByOrganizationId(
            UUID organizationId, PageRequest pageable);

    long countByOrganizationId(UUID organizationId);

    interface OrganizationReservationProjection {
        UUID getId();

        UUID getSportSpaceId();

        String getSpaceName();

        String getVenueName();

        UUID getCustomerUserId();

        String getCustomerEmail();

        Instant getStartsAt();

        Instant getEndsAt();

        String getStatus();

        long getTotalMinor();

        long getDepositMinor();

        String getCurrency();

        Instant getExpiresAt();
    }

    @Query(
            """
            select r from ReservationJpaEntity r
            where r.sportSpaceId = :spaceId and r.startsAt < :endsAt and r.endsAt > :startsAt
              and (r.status = :confirmedStatus or (r.status in :temporaryStatuses and r.expiresAt > :now))
            """)
    List<ReservationJpaEntity> findBlocking(
            @Param("spaceId") UUID spaceId,
            @Param("startsAt") Instant startsAt,
            @Param("endsAt") Instant endsAt,
            @Param("now") Instant now,
            @Param("confirmedStatus") ReservationStatus confirmedStatus,
            @Param("temporaryStatuses") List<ReservationStatus> temporaryStatuses);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query(
            """
            select reservation from ReservationJpaEntity reservation
            where reservation.sportSpaceId = :spaceId
              and reservation.status in :statuses
              and reservation.expiresAt <= :now
              and reservation.startsAt < :endsAt
              and reservation.endsAt > :startsAt
            """)
    List<ReservationJpaEntity> findExpiredOverlappingHoldsForUpdate(
            @Param("spaceId") UUID spaceId,
            @Param("statuses") List<ReservationStatus> statuses,
            @Param("startsAt") Instant startsAt,
            @Param("endsAt") Instant endsAt,
            @Param("now") Instant now);
}
