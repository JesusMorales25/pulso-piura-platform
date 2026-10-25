package com.pulsopiura.platform.payments.application;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.pulsopiura.platform.payments.application.ExternalPaymentModels.*;
import com.pulsopiura.platform.payments.application.port.PaymentProofStorage;
import com.pulsopiura.platform.payments.infrastructure.persistence.ExternalPaymentStore;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

class ExternalPaymentHistoryTest {
    @Test
    void returnsEventsOnlyForProofsVisibleToActor() {
        var store = mock(ExternalPaymentStore.class);
        var service =
                spy(
                        new ExternalPaymentService(
                                store,
                                mock(ExternalPaymentTargets.class),
                                mock(PaymentProofStorage.class),
                                "external_manual",
                                30));
        var actor = UUID.randomUUID();
        var target = UUID.randomUUID();
        var proof = mock(ProofView.class);
        var id = UUID.randomUUID();
        when(proof.id()).thenReturn(id);
        doReturn(List.of(proof)).when(service).list(actor, TargetType.RESERVATION, target);
        var allowed =
                new HistoryEvent(UUID.randomUUID(), id, "CONFIRMED", "Verificado", Instant.now());
        var other =
                new HistoryEvent(
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        "CONFIRMED",
                        "Privado",
                        Instant.now());
        when(store.history(TargetType.RESERVATION, target)).thenReturn(List.of(allowed, other));
        assertThat(service.history(actor, TargetType.RESERVATION, target)).containsExactly(allowed);
    }

    @Test
    void doesNotQueryHistoryIfAccessIsDenied() {
        var store = mock(ExternalPaymentStore.class);
        var service =
                spy(
                        new ExternalPaymentService(
                                store,
                                mock(ExternalPaymentTargets.class),
                                mock(PaymentProofStorage.class),
                                "external_manual",
                                30));
        var actor = UUID.randomUUID();
        var target = UUID.randomUUID();
        doThrow(new AccessDeniedException("Forbidden"))
                .when(service)
                .list(actor, TargetType.RESERVATION, target);
        assertThatThrownBy(() -> service.history(actor, TargetType.RESERVATION, target))
                .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(store);
    }
}
