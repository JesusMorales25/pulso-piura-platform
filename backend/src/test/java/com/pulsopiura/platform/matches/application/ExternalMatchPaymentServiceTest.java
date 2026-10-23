package com.pulsopiura.platform.matches.application;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.pulsopiura.platform.matches.domain.*;
import com.pulsopiura.platform.matches.infrastructure.persistence.*;
import com.pulsopiura.platform.payments.application.ExternalPaymentModels.*;
import com.pulsopiura.platform.payments.domain.*;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.*;
import org.mockito.ArgumentCaptor;

class ExternalMatchPaymentServiceTest {
    final MatchParticipantStore participants = mock(MatchParticipantStore.class);
    final MatchJoinOrderRepository orders = mock(MatchJoinOrderRepository.class);
    final MatchParticipationService participation = mock(MatchParticipationService.class);
    final ExternalMatchPaymentService service =
            new ExternalMatchPaymentService(participants, orders, participation);
    final SportsMatch match = mock(SportsMatch.class);
    final UUID actor = UUID.randomUUID(),
            organizer = UUID.randomUUID(),
            id = UUID.randomUUID(),
            org = UUID.randomUUID();
    final Instant now = Instant.now();

    @BeforeEach
    void setup() {
        when(match.id()).thenReturn(id);
        when(match.organizationId()).thenReturn(org);
        when(match.organizerUserId()).thenReturn(organizer);
        when(match.startsAt()).thenReturn(now.plusSeconds(7200));
        when(match.status()).thenReturn(MatchStatus.PUBLISHED);
        when(match.maxPlayers()).thenReturn(1);
        when(match.priceMinor()).thenReturn(1500L);
    }

    MatchJoinOrderEntity pending() {
        return MatchJoinOrderEntity.pending(
                org,
                id,
                actor,
                1500,
                MatchPaymentMethod.YAPE,
                "external-key",
                now.plusSeconds(1800),
                now);
    }

    Proof proof(MatchJoinOrderEntity order, Instant expires) {
        return new Proof(
                UUID.randomUUID(),
                TargetType.MATCH,
                id,
                id,
                actor,
                "Jugador",
                1500,
                "YAPE",
                "FULL",
                "PENDING_REVIEW",
                null,
                "Receptor",
                "999888777",
                "proof.png",
                "a".repeat(64),
                100,
                "proof-key",
                order.id(),
                now,
                expires,
                null,
                null);
    }

    @Test
    void fullMatchCannotHoldAnotherPlace() {
        when(participants.countByMatchAndStatus(id, MatchParticipantStatus.JOINED)).thenReturn(1L);
        assertThatThrownBy(
                        () ->
                                service.prepare(
                                        match,
                                        actor,
                                        PaymentMethod.YAPE,
                                        PaymentPlan.FULL,
                                        "key",
                                        now,
                                        now.plusSeconds(1800)))
                .hasMessageContaining("No quedan cupos");
        verify(orders, never()).saveAndFlush(any());
    }

    @Test
    void pendingProofHoldsCountAgainstCapacity() {
        when(orders.countByMatchIdAndStatusAndExpiresAtAfter(id, "PENDING", now)).thenReturn(1L);
        assertThatThrownBy(
                        () ->
                                service.prepare(
                                        match,
                                        actor,
                                        PaymentMethod.YAPE,
                                        PaymentPlan.FULL,
                                        "key",
                                        now,
                                        now.plusSeconds(1800)))
                .hasMessageContaining("No quedan cupos");
    }

    @Test
    void organizerPaymentHoldDoesNotConsumeAnAdditionalPlayingPlace() {
        when(match.organizerCounts()).thenReturn(true);
        when(match.maxPlayers()).thenReturn(3);
        var organizerOrder =
                MatchJoinOrderEntity.pending(
                        org,
                        id,
                        organizer,
                        1500,
                        MatchPaymentMethod.YAPE,
                        "organizer-key",
                        now.plusSeconds(300),
                        now);
        organizerOrder.markExternal();
        var otherOrder =
                MatchJoinOrderEntity.pending(
                        org,
                        id,
                        UUID.randomUUID(),
                        1500,
                        MatchPaymentMethod.YAPE,
                        "other-key",
                        now.plusSeconds(300),
                        now);
        otherOrder.markExternal();
        when(orders.findAllByMatchIdOrderByCreatedAtAsc(id))
                .thenReturn(List.of(organizerOrder, otherOrder));
        when(orders.countByMatchIdAndStatusAndExpiresAtAfter(id, "PENDING", now)).thenReturn(2L);
        assertThat(
                        service.prepare(
                                        match,
                                        actor,
                                        PaymentMethod.YAPE,
                                        PaymentPlan.FULL,
                                        "third-key",
                                        now,
                                        now.plusSeconds(300))
                                .amountMinor())
                .isEqualTo(1500);
    }

    @Test
    void holdUsesServerPriceAndExternalLedgerFlag() {
        var hold =
                service.prepare(
                        match,
                        actor,
                        PaymentMethod.YAPE,
                        PaymentPlan.FULL,
                        "key",
                        now,
                        now.plusSeconds(1800));
        var captor = ArgumentCaptor.forClass(MatchJoinOrderEntity.class);
        verify(orders).saveAndFlush(captor.capture());
        assertThat(hold.amountMinor()).isEqualTo(1500);
        assertThat(captor.getValue().simulated()).isFalse();
        assertThat(captor.getValue().status()).isEqualTo("PENDING");
        assertThat(captor.getValue().expiresAt()).isEqualTo(now.plusSeconds(1800));
    }

    @Test
    void simulatedPaidOrderPreventsAnotherExternalPayment() {
        var simulated = pending();
        simulated.markPaid("SIM-test", now);
        when(orders.findAllByMatchIdOrderByCreatedAtAsc(id)).thenReturn(List.of(simulated));
        assertThatThrownBy(
                        () ->
                                service.prepare(
                                        match,
                                        actor,
                                        PaymentMethod.YAPE,
                                        PaymentPlan.FULL,
                                        "key",
                                        now,
                                        now.plusSeconds(1800)))
                .hasMessageContaining("Ya existe un pago");
        verify(orders, never()).saveAndFlush(any());
    }

    @Test
    void prepareReusesOwnExternalHoldWithoutExtendingInitialExpiry() {
        var order = pending();
        order.markExternal();
        when(orders.findAllByMatchIdOrderByCreatedAtAsc(id)).thenReturn(List.of(order));
        var result =
                service.prepare(
                        match,
                        actor,
                        PaymentMethod.YAPE,
                        PaymentPlan.FULL,
                        "retry-key",
                        now,
                        now.plusSeconds(300));
        assertThat(result.ledgerOrderId()).isEqualTo(order.id());
        assertThat(result.expiresAt()).isEqualTo(order.expiresAt());
        verify(orders, never()).saveAndFlush(any());
    }

    @Test
    void uploadedProofExtendsExistingPreparedHoldWithoutCreatingAnotherOrder() {
        var order =
                MatchJoinOrderEntity.pending(
                        org,
                        id,
                        actor,
                        1500,
                        MatchPaymentMethod.YAPE,
                        "prepare-key",
                        now.plusSeconds(300),
                        now);
        order.markExternal();
        when(orders.findAllByMatchIdOrderByCreatedAtAsc(id)).thenReturn(List.of(order));
        var result =
                service.hold(
                        match,
                        actor,
                        PaymentMethod.YAPE,
                        PaymentPlan.FULL,
                        "proof-key",
                        now.plusSeconds(60),
                        now.plusSeconds(1860));
        assertThat(result.ledgerOrderId()).isEqualTo(order.id());
        assertThat(result.expiresAt()).isEqualTo(now.plusSeconds(1860));
        verify(orders).saveAndFlush(order);
    }

    @Test
    void uploadCannotAcquireUnpreparedOrExpiredPlaceAfterTransfer() {
        assertThatThrownBy(
                        () ->
                                service.hold(
                                        match,
                                        actor,
                                        PaymentMethod.YAPE,
                                        PaymentPlan.FULL,
                                        "proof-key",
                                        now,
                                        now.plusSeconds(1800)))
                .hasMessageContaining("No vuelvas a transferir");
        var order = pending();
        order.markExternal();
        order.expire(now);
        when(orders.findAllByMatchIdOrderByCreatedAtAsc(id)).thenReturn(List.of(order));
        assertThatThrownBy(
                        () ->
                                service.hold(
                                        match,
                                        actor,
                                        PaymentMethod.YAPE,
                                        PaymentPlan.FULL,
                                        "proof-key",
                                        now,
                                        now.plusSeconds(1800)))
                .hasMessageContaining("No vuelvas a transferir");
        verify(orders, never()).saveAndFlush(any());
    }

    @Test
    void lateEvidenceCannotConfirmEvenWhenCapacityIsAvailable() {
        var order = pending();
        assertThat(service.confirm(match, proof(order, now.minusSeconds(1)), now)).isFalse();
        verifyNoInteractions(participation);
        verify(orders, never()).saveAndFlush(any());
    }

    @Test
    void reassignedCapacityNeverBecomesPaidOrWaitlisted() {
        var order = pending();
        when(orders.findByIdForUpdate(order.id())).thenReturn(Optional.of(order));
        when(participants.countByMatchAndStatus(id, MatchParticipantStatus.JOINED)).thenReturn(1L);
        assertThat(service.confirm(match, proof(order, now.plusSeconds(1800)), now)).isFalse();
        verifyNoInteractions(participation);
        assertThat(order.status()).isEqualTo("PENDING");
    }

    @Test
    void confirmationJoinsParticipantAndMarksRealLedgerPaidTogether() {
        var order = pending();
        order.markExternal();
        when(orders.findByIdForUpdate(order.id())).thenReturn(Optional.of(order));
        var proof = proof(order, now.plusSeconds(1800));
        assertThat(service.confirm(match, proof, now)).isTrue();
        verify(participation).confirmPaidJoin(match, actor, now);
        assertThat(order.status()).isEqualTo("PAID");
        assertThat(order.simulated()).isFalse();
        assertThat(order.providerReference()).isEqualTo("external:" + proof.id());
    }
}
