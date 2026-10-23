package com.pulsopiura.platform.payments.application;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.pulsopiura.platform.payments.application.ExternalPaymentModels.*;
import com.pulsopiura.platform.payments.application.port.PaymentProofStorage;
import com.pulsopiura.platform.payments.infrastructure.persistence.ExternalPaymentStore;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.Test;

class PaymentProofRetentionTest {
    @Test
    void removesImageBeforeClearingMetadataAndRetriesFailures() {
        var store = mock(ExternalPaymentStore.class);
        var images = mock(PaymentProofStorage.class);
        var p =
                new Proof(
                        UUID.randomUUID(),
                        TargetType.MATCH,
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        "Jugador",
                        100,
                        "YAPE",
                        "FULL",
                        "CONFIRMED",
                        null,
                        "Receptor",
                        "999888777",
                        "proof.png",
                        "a".repeat(64),
                        100,
                        "key",
                        null,
                        Instant.now(),
                        Instant.now(),
                        Instant.now(),
                        null);
        when(store.retentionCandidates(90)).thenReturn(List.of(p));
        new PaymentProofRetention(store, images, 90).purge();
        var order = inOrder(images, store);
        order.verify(images).delete("proof.png");
        order.verify(store).imageDeleted(p);
        reset(images, store);
        when(store.retentionCandidates(90)).thenReturn(List.of(p));
        doThrow(new IllegalStateException("disk unavailable")).when(images).delete("proof.png");
        new PaymentProofRetention(store, images, 90).purge();
        verify(store, never()).imageDeleted(any());
    }

    @Test
    void retentionCannotBeDisabledAccidentallyWithNonPositiveDays() {
        assertThatThrownBy(
                        () ->
                                new PaymentProofRetention(
                                        mock(ExternalPaymentStore.class),
                                        mock(PaymentProofStorage.class),
                                        0))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
