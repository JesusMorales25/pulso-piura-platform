package com.pulsopiura.platform.matches.application;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.pulsopiura.platform.matches.domain.*;
import com.pulsopiura.platform.matches.infrastructure.persistence.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;

@ExtendWith(MockitoExtension.class)
class MatchOrganizerManagementServiceTest {
    @Mock MatchStore matches;
    @Mock MatchParticipantStore participants;
    @Mock MatchJoinOrderRepository orders;
    @Mock ApplicationEventPublisher events;

    private final Instant now = Instant.parse("2026-09-09T15:00:00Z");
    private final UUID organizer = UUID.randomUUID();
    private final UUID player = UUID.randomUUID();
    private SportsMatch match;
    private MatchParticipant participant;
    private MatchOrganizerManagementService service;

    @BeforeEach
    void setup() {
        match =
                SportsMatch.restore(
                        UUID.randomUUID(),
                        "partido-administrado",
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        organizer,
                        "Partido administrado",
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
        participant =
                MatchParticipant.enroll(
                        match.organizationId(),
                        match.id(),
                        player,
                        MatchParticipantStatus.JOINED,
                        now.minusSeconds(300));
        service =
                new MatchOrganizerManagementService(
                        matches, participants, orders, events, Clock.fixed(now, ZoneOffset.UTC));
    }

    @Test
    void organizerCanRemoveAnUnpaidParticipantFromOwnMatch() {
        when(matches.findByIdForUpdate(match.id())).thenReturn(Optional.of(match));
        when(participants.findByMatchAndUser(match.id(), player))
                .thenReturn(Optional.of(participant));
        when(orders.findFirstByMatchIdAndPayerUserIdAndStatusOrderByCreatedAtDesc(
                        match.id(), player, "PAID"))
                .thenReturn(Optional.empty());
        when(participants.findByMatchAndStatusOrdered(
                        match.id(), MatchParticipantStatus.WAITLISTED))
                .thenReturn(List.of());

        service.removeParticipant(organizer, match.id(), player);

        verify(participants).save(participant);
        verify(events).publishEvent(any(MatchAuditEvent.class));
    }

    @Test
    void paidParticipantCannotBeRemovedFromThePanel() {
        when(matches.findByIdForUpdate(match.id())).thenReturn(Optional.of(match));
        when(participants.findByMatchAndUser(match.id(), player))
                .thenReturn(Optional.of(participant));
        when(orders.findFirstByMatchIdAndPayerUserIdAndStatusOrderByCreatedAtDesc(
                        match.id(), player, "PAID"))
                .thenReturn(Optional.of(paidOrder()));

        assertThatThrownBy(() -> service.removeParticipant(organizer, match.id(), player))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("pago confirmado");
        verify(participants, never()).save(any());
    }

    @Test
    void anotherOrganizerCannotManageTheRoster() {
        when(matches.findByIdForUpdate(match.id())).thenReturn(Optional.of(match));

        assertThatThrownBy(() -> service.removeParticipant(UUID.randomUUID(), match.id(), player))
                .isInstanceOf(AccessDeniedException.class);
        verify(participants, never()).findByMatchAndUser(any(), any());
    }

    private MatchJoinOrderEntity paidOrder() {
        var order =
                MatchJoinOrderEntity.pending(
                        match.organizationId(),
                        match.id(),
                        player,
                        1500,
                        MatchPaymentMethod.YAPE,
                        "paid-order",
                        now.plusSeconds(300),
                        now.minusSeconds(30));
        order.markPaid("SIM-PAID", now.minusSeconds(10));
        return order;
    }
}
