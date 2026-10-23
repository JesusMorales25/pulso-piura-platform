package com.pulsopiura.platform.payments.application;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.pulsopiura.platform.payments.application.ExternalPaymentModels.*;
import com.pulsopiura.platform.payments.application.port.PaymentProofStorage;
import com.pulsopiura.platform.payments.domain.*;
import com.pulsopiura.platform.payments.infrastructure.persistence.ExternalPaymentStore;
import com.pulsopiura.platform.reservations.domain.Reservation;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.support.*;

class ExternalPaymentServiceTest {
    final ExternalPaymentStore store = mock(ExternalPaymentStore.class);
    final ExternalPaymentTargets targets = mock(ExternalPaymentTargets.class);
    final PaymentProofStorage images = mock(PaymentProofStorage.class);
    final ExternalPaymentService service =
            new ExternalPaymentService(store, targets, images, "external_manual", 30);
    final UUID actor = UUID.randomUUID(),
            owner = UUID.randomUUID(),
            target = UUID.randomUUID(),
            receiver = UUID.randomUUID();
    final Destination destination = new Destination("Receptor", "999888777", true, true, true);
    ExternalPaymentTargets.Context context;
    final Map<UUID, Proof> database = new HashMap<>();

    @BeforeEach
    void setup() {
        var reservation = mock(Reservation.class);
        when(reservation.timeRange())
                .thenReturn(
                        new com.pulsopiura.platform.reservations.domain.ReservationTimeRange(
                                Instant.now().plusSeconds(7200), Instant.now().plusSeconds(10800)));
        context =
                new ExternalPaymentTargets.Context(
                        TargetType.RESERVATION, target, receiver, null, reservation);
        when(targets.resolve(eq(TargetType.RESERVATION), eq(target), any(), anyBoolean()))
                .thenReturn(context);
        when(targets.resolveOwnEvidence(any(), eq(actor), eq(true))).thenReturn(context);
        when(store.destination(TargetType.RESERVATION, receiver))
                .thenReturn(Optional.of(destination));
        when(store.payerName(actor)).thenReturn("Jugador");
        when(images.store(any()))
                .thenReturn(new PaymentProofStorage.StoredProof("image.png", "a".repeat(64), 120));
        when(store.get(any())).thenAnswer(call -> database.get(call.getArgument(0)));
        doAnswer(
                        call -> {
                            var p = call.<Proof>getArgument(0);
                            database.put(p.id(), p);
                            return null;
                        })
                .when(store)
                .save(any());
        doAnswer(
                        call -> {
                            UUID id = call.getArgument(0);
                            var p = database.get(id);
                            database.put(
                                    id,
                                    new Proof(
                                            p.id(),
                                            p.targetType(),
                                            p.targetId(),
                                            p.receiverId(),
                                            p.payerUserId(),
                                            p.payerName(),
                                            p.amountMinor(),
                                            p.method(),
                                            p.plan(),
                                            call.getArgument(1),
                                            p.reference(),
                                            p.holderName(),
                                            p.phone(),
                                            p.storageKey(),
                                            p.sha256(),
                                            p.sizeBytes(),
                                            p.idempotencyKey(),
                                            p.ledgerOrderId(),
                                            p.createdAt(),
                                            p.reviewExpiresAt(),
                                            call.getArgument(3),
                                            call.getArgument(2)));
                            return null;
                        })
                .when(store)
                .decide(any(), anyString(), nullable(String.class), any());
        TransactionSynchronizationManager.initSynchronization();
    }

    @AfterEach
    void cleanup() {
        TransactionSynchronizationManager.clearSynchronization();
    }

    Proof proof(String status, Instant expires) {
        var p =
                new Proof(
                        UUID.randomUUID(),
                        TargetType.RESERVATION,
                        target,
                        receiver,
                        actor,
                        "Jugador",
                        9000,
                        "YAPE",
                        "FULL",
                        status,
                        "REF-1",
                        "Receptor",
                        "999888777",
                        "old.png",
                        "a".repeat(64),
                        120,
                        "key-123",
                        null,
                        Instant.now().minusSeconds(60),
                        expires,
                        null,
                        null);
        database.put(p.id(), p);
        return p;
    }

    @Test
    void preparationReturnsServerAmountAndBoundedExpiryOnlyAfterAcquiringHold() {
        var expiry = Instant.now().plusSeconds(300);
        when(targets.prepare(
                        eq(context),
                        eq(actor),
                        eq(PaymentMethod.YAPE),
                        eq(PaymentPlan.DEPOSIT),
                        eq("prepare-key"),
                        any(),
                        any()))
                .thenReturn(new ExternalPaymentTargets.Hold(2250, expiry, null));
        var result =
                service.prepare(
                        actor,
                        TargetType.RESERVATION,
                        target,
                        PaymentMethod.YAPE,
                        PaymentPlan.DEPOSIT,
                        "prepare-key");
        assertThat(result.amountMinor()).isEqualTo(2250);
        assertThat(result.expiresAt()).isEqualTo(expiry);
        assertThat(result.destination()).isEqualTo(destination);
        verify(targets)
                .prepare(
                        eq(context),
                        eq(actor),
                        eq(PaymentMethod.YAPE),
                        eq(PaymentPlan.DEPOSIT),
                        eq("prepare-key"),
                        any(),
                        argThat(deadline -> !deadline.isAfter(Instant.now().plusSeconds(300))));
    }

    @Test
    void preparationIsDisabledOutsideExternalManualMode() {
        var disabled = new ExternalPaymentService(store, targets, images, "simulation", 30);
        assertThatThrownBy(
                        () ->
                                disabled.prepare(
                                        actor,
                                        TargetType.RESERVATION,
                                        target,
                                        PaymentMethod.YAPE,
                                        PaymentPlan.FULL,
                                        "prepare-key"))
                .isInstanceOf(IllegalStateException.class);
        verify(targets, never()).prepare(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void submissionUsesServerAmountAndRecipientSnapshot() {
        when(targets.hold(
                        eq(context),
                        eq(actor),
                        eq(PaymentMethod.YAPE),
                        eq(PaymentPlan.FULL),
                        eq("key-123"),
                        any(),
                        any()))
                .thenReturn(
                        new ExternalPaymentTargets.Hold(
                                9000, Instant.now().plusSeconds(1800), null));
        var view =
                service.submit(
                        actor,
                        TargetType.RESERVATION,
                        target,
                        PaymentMethod.YAPE,
                        PaymentPlan.FULL,
                        "REF-1",
                        "key-123",
                        destination.version(),
                        new byte[] {1});
        assertThat(view.amountMinor()).isEqualTo(9000);
        assertThat(view.status()).isEqualTo("PENDING_REVIEW");
        assertThat(view.phone()).isEqualTo(destination.phone());
        assertThat(view.hasImage()).isTrue();
        verify(store)
                .audit(
                        eq(view.id()),
                        eq(TargetType.RESERVATION),
                        eq(target),
                        eq(actor),
                        eq("PROOF_SUBMITTED"),
                        isNull());
    }

    @Test
    void changedRecipientRejectsBeforeHoldingAndRollbackDeletesUploadedFile() {
        assertThatThrownBy(
                        () ->
                                service.submit(
                                        actor,
                                        TargetType.RESERVATION,
                                        target,
                                        PaymentMethod.YAPE,
                                        PaymentPlan.FULL,
                                        null,
                                        "key-123",
                                        "old-version",
                                        new byte[] {1}))
                .hasMessageContaining("La cuenta receptora cambió");
        verify(targets, never()).hold(any(), any(), any(), any(), any(), any(), any());
        for (var sync : TransactionSynchronizationManager.getSynchronizations())
            sync.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK);
        verify(images).delete("image.png");
        verify(store, never()).save(any());
    }

    @Test
    void identicalUploadReplaysWithoutCreatingAnotherHold() {
        var p = proof("PENDING_REVIEW", Instant.now().plusSeconds(60));
        when(store.replay(actor, "key-123")).thenReturn(Optional.of(p));
        var view =
                service.submit(
                        actor,
                        TargetType.RESERVATION,
                        target,
                        PaymentMethod.YAPE,
                        PaymentPlan.FULL,
                        "REF-1",
                        "key-123",
                        destination.version(),
                        new byte[] {1});
        assertThat(view.id()).isEqualTo(p.id());
        verify(images).delete("image.png");
        verify(targets, never()).hold(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void idempotencyKeyCannotChangeSelectedPaymentPlan() {
        when(store.replay(actor, "key-123"))
                .thenReturn(Optional.of(proof("PENDING_REVIEW", Instant.now().plusSeconds(60))));
        assertThatThrownBy(
                        () ->
                                service.submit(
                                        actor,
                                        TargetType.RESERVATION,
                                        target,
                                        PaymentMethod.YAPE,
                                        PaymentPlan.DEPOSIT,
                                        "REF-1",
                                        "key-123",
                                        destination.version(),
                                        new byte[] {1}))
                .hasMessageContaining("otro comprobante");
    }

    @Test
    void onlyReceiverCanDecideEvenWhenPayerKnowsProofId() {
        var p = proof("PENDING_REVIEW", Instant.now().plusSeconds(60));
        doThrow(new AccessDeniedException("Sin permiso"))
                .when(targets)
                .requireReviewer(context, actor);
        assertThatThrownBy(() -> service.decide(actor, p.id(), Decision.CONFIRMED, null))
                .isInstanceOf(AccessDeniedException.class);
        verify(targets, never()).confirm(any(), any(), any(), any());
        verify(store, never()).decide(any(), anyString(), any(), any());
    }

    @Test
    void lateConfirmationRetainsMoneyEvidenceWithoutPayingOrReclaimingPlace() {
        var p = proof("PENDING_REVIEW", Instant.now().minusSeconds(1));
        when(targets.confirm(eq(context), eq(p), eq(owner), any())).thenReturn(false);
        var result = service.decide(owner, p.id(), Decision.CONFIRMED, "Recibido fuera de plazo");
        assertThat(result.status()).isEqualTo("NEEDS_RESOLUTION");
        assertThat(result.hasImage()).isTrue();
        verify(targets).release(eq(p), any());
    }

    @Test
    void confirmedDecisionIsIdempotentAndNeverPaysTwice() {
        var p = proof("PENDING_REVIEW", Instant.now().plusSeconds(60));
        when(targets.confirm(eq(context), eq(p), eq(owner), any())).thenReturn(true);
        var result = service.decide(owner, p.id(), Decision.CONFIRMED, null);
        assertThat(result.status()).isEqualTo("CONFIRMED");
        assertThat(service.decide(owner, p.id(), Decision.CONFIRMED, null).status())
                .isEqualTo("CONFIRMED");
        verify(targets, times(1)).confirm(eq(context), any(), eq(owner), any());
    }

    @Test
    void listsOnlyPayerEvidenceAndReviewerSeesAll() {
        var mine = proof("PENDING_REVIEW", Instant.now().plusSeconds(60));
        var other =
                new Proof(
                        UUID.randomUUID(),
                        mine.targetType(),
                        mine.targetId(),
                        mine.receiverId(),
                        UUID.randomUUID(),
                        "Otro",
                        100,
                        "YAPE",
                        "FULL",
                        "PENDING_REVIEW",
                        null,
                        mine.holderName(),
                        mine.phone(),
                        "other.png",
                        mine.sha256(),
                        120,
                        "other-key",
                        null,
                        mine.createdAt(),
                        mine.reviewExpiresAt(),
                        null,
                        null);
        database.put(other.id(), other);
        when(store.list(TargetType.RESERVATION, target)).thenReturn(List.of(mine, other));
        assertThat(service.list(actor, TargetType.RESERVATION, target))
                .extracting(ProofView::id)
                .containsExactly(mine.id());
        when(targets.reviewer(context, owner)).thenReturn(true);
        assertThat(service.list(owner, TargetType.RESERVATION, target)).hasSize(2);
    }

    @Test
    void payerCanReadOwnEvidenceAfterTargetAccessWasRevoked() {
        var p = proof("CONFIRMED", Instant.now().minusSeconds(60));
        when(images.read("old.png")).thenReturn(new byte[] {3});
        assertThat(service.image(actor, p.id())).containsExactly((byte) 3);
        verify(targets, never()).resolve(any(), any(), any(), anyBoolean());
    }

    @Test
    void thirdPartyCannotReadImage() {
        var p = proof("CONFIRMED", Instant.now().minusSeconds(60));
        assertThatThrownBy(() -> service.image(owner, p.id()))
                .isInstanceOf(AccessDeniedException.class);
        verify(images, never()).read(any());
    }
}
