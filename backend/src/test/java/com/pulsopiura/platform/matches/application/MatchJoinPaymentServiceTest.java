package com.pulsopiura.platform.matches.application;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.pulsopiura.platform.matches.domain.*;
import com.pulsopiura.platform.matches.infrastructure.persistence.*;
import com.pulsopiura.platform.reservations.application.ReservationConflictException;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class MatchJoinPaymentServiceTest {
    @Mock MatchStore matches;
    @Mock MatchParticipantStore participants;
    @Mock MatchJoinOrderRepository orders;
    @Mock MatchParticipationService participation;
    @Mock MatchPaymentProvider provider;
    final Instant now = Instant.parse("2026-09-08T20:00:00Z");
    final UUID actor = UUID.randomUUID();
    SportsMatch match;
    MatchJoinPaymentService service;

    @BeforeEach
    void setup() {
        match =
                SportsMatch.restore(
                        UUID.randomUUID(),
                        "partido-prueba",
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        "Partido prueba",
                        "FOOTBALL",
                        "FOOTBALL_7",
                        SkillLevel.INTERMEDIATE,
                        2,
                        10,
                        false,
                        1500,
                        MatchVisibility.PUBLIC,
                        "Sin devoluciones",
                        now.plusSeconds(7200),
                        now.plusSeconds(10800),
                        MatchStatus.PUBLISHED,
                        now.minusSeconds(60),
                        now.minusSeconds(120),
                        now.minusSeconds(60),
                        0);
        service =
                new MatchJoinPaymentService(
                        matches,
                        participants,
                        orders,
                        participation,
                        provider,
                        Clock.fixed(now, ZoneOffset.UTC));
        lenient().when(provider.simulationEnabled()).thenReturn(true);
        lenient()
                .when(matches.findPublishedBySlugForUpdate("partido-prueba"))
                .thenReturn(Optional.of(match));
        lenient()
                .when(orders.findByPayerUserIdAndIdempotencyKey(any(), any()))
                .thenReturn(Optional.empty());
        lenient()
                .when(
                        orders.findFirstByMatchIdAndPayerUserIdAndStatusOrderByCreatedAtDesc(
                                any(), any(), any()))
                .thenReturn(Optional.empty());
        lenient().when(participants.findByMatchAndUser(any(), any())).thenReturn(Optional.empty());
        lenient()
                .when(orders.saveAndFlush(any()))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void holdsTheSlotWhileTheMatchIsLocked() {
        when(participants.countByMatchAndStatus(match.id(), MatchParticipantStatus.JOINED))
                .thenReturn(8L);
        when(orders.countByMatchIdAndStatusAndExpiresAtAfter(match.id(), "PENDING", now))
                .thenReturn(1L);
        var result = service.start(actor, "partido-prueba", MatchPaymentMethod.YAPE, "attempt-1");
        assertThat(result.status()).isEqualTo("PENDING");
        assertThat(result.expiresAt()).isEqualTo(now.plus(Duration.ofMinutes(5)));
        verify(matches).findPublishedBySlugForUpdate("partido-prueba");
    }

    @Test
    void rejectsAnotherHoldWhenTheLastSlotIsAlreadyHeld() {
        when(participants.countByMatchAndStatus(match.id(), MatchParticipantStatus.JOINED))
                .thenReturn(9L);
        when(orders.countByMatchIdAndStatusAndExpiresAtAfter(match.id(), "PENDING", now))
                .thenReturn(1L);
        assertThatThrownBy(
                        () ->
                                service.start(
                                        actor,
                                        "partido-prueba",
                                        MatchPaymentMethod.PLIN,
                                        "attempt-2"))
                .isInstanceOf(ReservationConflictException.class)
                .hasMessageContaining("cupos");
        verify(orders, never()).saveAndFlush(argThat(order -> "PENDING".equals(order.status())));
    }

    @Test
    void paymentAndParticipationAreConfirmedInTheSameServiceTransaction() {
        var order =
                MatchJoinOrderEntity.pending(
                        match.organizationId(),
                        match.id(),
                        actor,
                        1500,
                        MatchPaymentMethod.YAPE,
                        "attempt-3",
                        now.plusSeconds(300),
                        now.minusSeconds(5));
        when(orders.matchIdForOrder(order.id())).thenReturn(Optional.of(match.id()));
        when(matches.findByIdForUpdate(match.id())).thenReturn(Optional.of(match));
        when(orders.findByIdForUpdate(order.id())).thenReturn(Optional.of(order));
        when(provider.simulateConfirmedPayment(order.id())).thenReturn("SIM-123");
        var result = service.simulate(actor, order.id());
        assertThat(result.status()).isEqualTo("PAID");
        assertThat(result.providerReference()).isEqualTo("SIM-123");
        verify(participation).confirmPaidJoin(match, actor, now);
    }

    @Test
    void returnsTheExistingPaidOrderInsteadOfChargingOrRegisteringThePlayerAgain() {
        var paidOrder =
                MatchJoinOrderEntity.pending(
                        match.organizationId(),
                        match.id(),
                        actor,
                        1500,
                        MatchPaymentMethod.YAPE,
                        "first-payment",
                        now.plusSeconds(300),
                        now.minusSeconds(10));
        paidOrder.markPaid("SIM-PAID", now.minusSeconds(5));
        when(orders.findFirstByMatchIdAndPayerUserIdAndStatusOrderByCreatedAtDesc(
                        match.id(), actor, "PAID"))
                .thenReturn(Optional.of(paidOrder));

        var result =
                service.start(actor, "partido-prueba", MatchPaymentMethod.PLIN, "second-attempt");

        assertThat(result.id()).isEqualTo(paidOrder.id());
        assertThat(result.status()).isEqualTo("PAID");
        verify(orders, never()).saveAndFlush(any());
        verifyNoInteractions(participation);
    }
}
