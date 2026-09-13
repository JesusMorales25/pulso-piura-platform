package com.pulsopiura.platform.payments.infrastructure.persistence;

import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface PaymentOrderRepository extends JpaRepository<PaymentOrderEntity, UUID> {
    Optional<PaymentOrderEntity> findByReservationIdAndInstallment(
            UUID reservationId, String installment);

    Optional<PaymentOrderEntity> findByPayerUserIdAndIdempotencyKey(UUID payerUserId, String key);

    List<PaymentOrderEntity> findAllByReservationIdOrderByCreatedAtAsc(UUID reservationId);

    @Query("select p.reservationId from PaymentOrderEntity p where p.id = :id")
    Optional<UUID> reservationIdForOrder(UUID id);

    @Query(
            "select coalesce(sum(p.amountMinor), 0) from PaymentOrderEntity p where p.reservationId = :reservationId and p.status = 'PAID'")
    long sumPaid(UUID reservationId);
}
