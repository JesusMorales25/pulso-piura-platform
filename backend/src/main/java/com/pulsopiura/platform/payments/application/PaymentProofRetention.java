package com.pulsopiura.platform.payments.application;

import com.pulsopiura.platform.payments.application.port.PaymentProofStorage;
import com.pulsopiura.platform.payments.infrastructure.persistence.ExternalPaymentStore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Removes only resolved image evidence; financial metadata and audit remain permanently. */
@Component
public class PaymentProofRetention {
    private static final Logger LOG = LoggerFactory.getLogger(PaymentProofRetention.class);
    private final ExternalPaymentStore store;
    private final PaymentProofStorage images;
    private final int days;

    public PaymentProofRetention(
            ExternalPaymentStore store,
            PaymentProofStorage images,
            @Value("${app.payments.proof-retention-days:90}") int days) {
        if (days < 1) throw new IllegalArgumentException("La retención debe durar al menos un día");
        this.store = store;
        this.images = images;
        this.days = days;
    }

    @Scheduled(
            fixedDelayString = "${app.payments.retention-check-ms:3600000}",
            initialDelayString = "${app.payments.retention-check-ms:3600000}")
    public void purge() {
        for (var proof : store.retentionCandidates(days)) {
            try {
                // Delete is idempotent, so a crash before clearing metadata retries safely.
                images.delete(proof.storageKey());
                store.imageDeleted(proof);
            } catch (RuntimeException failure) {
                LOG.warn("Could not purge payment proof image {}", proof.id(), failure);
            }
        }
    }
}
