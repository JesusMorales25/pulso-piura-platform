package com.pulsopiura.platform.reservations.application;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.pulsopiura.platform.reservations.application.port.ReservationTimelineQuery;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

class ReservationTimelineServiceTest {
    @Test
    void checksReservationAccessBeforeReadingEvents() {
        var reservations = mock(ReservationQueryService.class);
        var query = mock(ReservationTimelineQuery.class);
        var service = new ReservationTimelineService(reservations, query);
        var actor = UUID.randomUUID();
        var id = UUID.randomUUID();
        when(reservations.get(actor, id)).thenThrow(new AccessDeniedException("Forbidden"));
        assertThatThrownBy(() -> service.list(actor, id)).isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(query);
    }

    @Test
    void returnsPersistedEventsAfterAccessCheck() {
        var reservations = mock(ReservationQueryService.class);
        var query = mock(ReservationTimelineQuery.class);
        var service = new ReservationTimelineService(reservations, query);
        var actor = UUID.randomUUID();
        var id = UUID.randomUUID();
        var events =
                List.of(
                        new ReservationTimelineQuery.Event(
                                UUID.randomUUID(),
                                null,
                                "HOLD",
                                Instant.parse("2026-10-25T02:00:00Z")));
        when(query.list(id)).thenReturn(events);
        assertThat(service.list(actor, id)).isEqualTo(events);
        var order = inOrder(reservations, query);
        order.verify(reservations).get(actor, id);
        order.verify(query).list(id);
    }
}
