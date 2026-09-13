package com.pulsopiura.platform.reservations.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.pulsopiura.platform.reservations.application.port.*;
import com.pulsopiura.platform.reservations.domain.*;
import com.pulsopiura.platform.reservations.infrastructure.config.ReservationProperties;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class ReservationCreationTransactionTest {
    private static final Instant NOW = Instant.parse("2026-09-04T20:00:00Z");

    @Test
    void expiresBlockingHoldAndAppendsBothTransitions() {
        var reservations = mock(ReservationStore.class);
        var history = mock(ReservationHistoryStore.class);
        var service =
                new ReservationCreationTransaction(
                        reservations, history, new ReservationProperties(Duration.ofMinutes(5), 3));
        var actorId = UUID.randomUUID();
        var organizationId = UUID.randomUUID();
        var spaceId = UUID.randomUUID();
        var expired =
                reservation(
                        organizationId,
                        spaceId,
                        UUID.randomUUID(),
                        NOW.minusSeconds(1200),
                        NOW.minusSeconds(60));
        var candidate = reservation(organizationId, spaceId, actorId, NOW, NOW.plusSeconds(600));
        when(reservations.findExpiredOverlappingHoldsForUpdate(
                        eq(candidate.sportSpaceId()), any(), any(), eq(NOW)))
                .thenReturn(List.of(expired));
        when(reservations.countActiveTemporaryByCustomer(actorId, NOW)).thenReturn(0L);
        when(reservations.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var result = service.create(candidate, actorId, "correlation-1", NOW);

        assertThat(result).isSameAs(candidate);
        assertThat(expired.status()).isEqualTo(ReservationStatus.EXPIRED);
        var transitions = ArgumentCaptor.forClass(ReservationStatusTransition.class);
        verify(history, times(2)).append(transitions.capture());
        assertThat(transitions.getAllValues())
                .extracting(ReservationStatusTransition::newStatus)
                .containsExactly(ReservationStatus.EXPIRED, ReservationStatus.HOLD);
        assertThat(transitions.getAllValues().getFirst().actorType())
                .isEqualTo(ReservationTransitionActor.SYSTEM);
    }

    @Test
    void rejectsCreationWhenCustomerReachedTemporaryReservationLimit() {
        var reservations = mock(ReservationStore.class);
        var history = mock(ReservationHistoryStore.class);
        var service =
                new ReservationCreationTransaction(
                        reservations, history, new ReservationProperties(Duration.ofMinutes(5), 3));
        var actorId = UUID.randomUUID();
        var candidate =
                reservation(
                        UUID.randomUUID(), UUID.randomUUID(), actorId, NOW, NOW.plusSeconds(300));
        when(reservations.countActiveTemporaryByCustomer(actorId, NOW)).thenReturn(3L);

        assertThatThrownBy(() -> service.create(candidate, actorId, "quota", NOW))
                .isInstanceOf(ReservationRateLimitException.class);
        verify(reservations).lockCustomerReservationCreation(actorId);
        verify(reservations, never()).save(any());
        verifyNoInteractions(history);
    }

    private Reservation reservation(
            UUID organizationId,
            UUID spaceId,
            UUID customerId,
            Instant createdAt,
            Instant expiresAt) {
        var startsAt = NOW.plusSeconds(3600);
        var endsAt = NOW.plusSeconds(7200);
        return Reservation.hold(
                organizationId,
                spaceId,
                customerId,
                new ReservationTimeRange(startsAt, endsAt),
                ReservationMoney.pen(9000),
                ReservationMoney.pen(0),
                expiresAt,
                new ReservationIdempotencyKey(UUID.randomUUID().toString()),
                ReservationRequestFingerprint.calculate(spaceId, startsAt, endsAt),
                createdAt);
    }
}
