package com.pulsopiura.platform.payments.infrastructure.persistence;

import com.pulsopiura.platform.payments.domain.*;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "payment_orders", schema = "app")
public class PaymentOrderEntity {
    @Id private UUID id;

    @Column(name = "reservation_id", nullable = false)
    private UUID reservationId;

    @Column(name = "payer_user_id", nullable = false)
    private UUID payerUserId;

    @Column(name = "amount_minor", nullable = false)
    private long amountMinor;

    @Column(nullable = false, length = 3)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PaymentMethod method;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentPlan plan;

    @Column(nullable = false, length = 20)
    private String installment;

    @Column(name = "idempotency_key", length = 100)
    private String idempotencyKey;

    @Column(nullable = false, length = 30)
    private String status;

    @Column(name = "provider_reference", unique = true, length = 120)
    private String providerReference;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Version private long version;

    protected PaymentOrderEntity() {}

    public static PaymentOrderEntity create(
            UUID reservationId,
            UUID payerUserId,
            long amountMinor,
            PaymentMethod method,
            PaymentPlan plan,
            String key,
            Instant now) {
        if (amountMinor <= 0) throw new IllegalArgumentException("El importe debe ser positivo");
        var order = new PaymentOrderEntity();
        order.id = UUID.randomUUID();
        order.reservationId = reservationId;
        order.payerUserId = payerUserId;
        order.amountMinor = amountMinor;
        order.currency = "PEN";
        order.method = method;
        order.plan = plan;
        order.installment = plan == PaymentPlan.BALANCE ? "BALANCE" : "INITIAL";
        order.idempotencyKey = key;
        order.status = "PENDING";
        order.createdAt = now;
        order.updatedAt = now;
        return order;
    }

    public UUID id() {
        return id;
    }

    public UUID reservationId() {
        return reservationId;
    }

    public UUID payerUserId() {
        return payerUserId;
    }

    public long amountMinor() {
        return amountMinor;
    }

    public PaymentMethod method() {
        return method;
    }

    public PaymentPlan plan() {
        return plan;
    }

    public String status() {
        return status;
    }

    public String providerReference() {
        return providerReference;
    }

    public Instant paidAt() {
        return paidAt;
    }

    public void markPaid(String reference, Instant now) {
        if ("PAID".equals(status)) return;
        if (!"PENDING".equals(status)) throw new IllegalStateException("La orden no admite pagos");
        status = "PAID";
        providerReference = reference;
        paidAt = now;
        updatedAt = now;
    }
}
