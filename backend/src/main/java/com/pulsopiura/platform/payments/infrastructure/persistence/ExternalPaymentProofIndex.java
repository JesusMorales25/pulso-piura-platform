package com.pulsopiura.platform.payments.infrastructure.persistence;

import jakarta.persistence.*;
import java.util.UUID;
import org.hibernate.annotations.Immutable;

/** Read-only projection for retaining reservation history with external money evidence. */
@Entity
@Immutable
@Table(name = "external_payment_proofs", schema = "app")
public class ExternalPaymentProofIndex {
    @Id private UUID id;

    @Column(name = "target_type", nullable = false, length = 20)
    private String targetType;

    @Column(name = "target_id", nullable = false)
    private UUID targetId;

    @Column(name = "payer_user_id", nullable = false)
    private UUID payerUserId;

    protected ExternalPaymentProofIndex() {}
}
