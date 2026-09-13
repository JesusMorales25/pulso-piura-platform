package com.pulsopiura.platform.reservations.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.pulsopiura.platform.reservations.application.port.ReservationHistoryStore;
import com.pulsopiura.platform.reservations.application.port.ReservationStore;
import com.pulsopiura.platform.reservations.domain.*;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class ReservationTransitionServiceTest {
    private static final Instant NOW = Instant.parse("2026-09-05T15:00:00Z");

    @Test
    void confirmsOnceUnderLockAndRecordsUserTransition() {
        var store = mock(ReservationStore.class);
        var history = mock(ReservationHistoryStore.class);
        var access = mock(ReservationAccess.class);
        var actor = UUID.randomUUID();
        var reservation = hold(actor, NOW.plusSeconds(600));
        when(store.findByIdForUpdate(reservation.id())).thenReturn(Optional.of(reservation));
        when(store.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        var service = service(store, history, access);

        var first = service.confirm(actor, reservation.id(), "correlation-1");
        var replay = service.confirm(actor, reservation.id(), "correlation-2");

        assertThat(first.status()).isEqualTo("CONFIRMED");
        assertThat(replay.status()).isEqualTo("CONFIRMED");
        verify(access, times(2)).requireManage(actor, reservation);
        verify(store, times(1)).save(reservation);
        var transition = ArgumentCaptor.forClass(ReservationStatusTransition.class);
        verify(history).append(transition.capture());
        assertThat(transition.getValue().newStatus()).isEqualTo(ReservationStatus.CONFIRMED);
        assertThat(transition.getValue().actorType()).isEqualTo(ReservationTransitionActor.USER);
    }

    @Test
    void expiresBeforeConfirmingAndRecordsSystemTransition() {
        var store = mock(ReservationStore.class);
        var history = mock(ReservationHistoryStore.class);
        var access = mock(ReservationAccess.class);
        var actor = UUID.randomUUID();
        var reservation = hold(actor, NOW);
        when(store.findByIdForUpdate(reservation.id())).thenReturn(Optional.of(reservation));
        when(store.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        var service = service(store, history, access);

        var result = service.confirm(actor, reservation.id(), "correlation-1");

        assertThat(result.status()).isEqualTo("EXPIRED");
        var transition = ArgumentCaptor.forClass(ReservationStatusTransition.class);
        verify(history).append(transition.capture());
        assertThat(transition.getValue().actorType()).isEqualTo(ReservationTransitionActor.SYSTEM);
        assertThat(transition.getValue().actorUserId()).isNull();
    }

    private ReservationTransitionService service(
            ReservationStore store, ReservationHistoryStore history, ReservationAccess access) {
        return new ReservationTransitionService(
                store,
                history,
                access,
                mock(
                        com.pulsopiura.platform.reservations.application.port
                                .ReservationPaymentQuery.class),
                Clock.fixed(NOW, ZoneOffset.UTC));
    }

    private Reservation hold(UUID actor, Instant expiration) {
        var space = UUID.randomUUID();
        var startsAt = NOW.plusSeconds(3600);
        var endsAt = NOW.plusSeconds(7200);
        return Reservation.hold(
                UUID.randomUUID(),
                space,
                actor,
                new ReservationTimeRange(startsAt, endsAt),
                ReservationMoney.pen(9000),
                ReservationMoney.pen(0),
                expiration,
                new ReservationIdempotencyKey(UUID.randomUUID().toString()),
                ReservationRequestFingerprint.calculate(space, startsAt, endsAt),
                NOW.minusSeconds(600));
    }
}
