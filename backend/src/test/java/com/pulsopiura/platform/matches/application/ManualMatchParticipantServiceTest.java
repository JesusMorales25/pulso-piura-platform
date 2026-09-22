package com.pulsopiura.platform.matches.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.pulsopiura.platform.matches.domain.*;
import java.time.*;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;

@ExtendWith(MockitoExtension.class)
class ManualMatchParticipantServiceTest {
    @Mock MatchStore matches;
    @Mock MatchParticipantStore participants;
    @Mock ManualMatchParticipantStore manualParticipants;
    @Mock ApplicationEventPublisher events;

    private final Instant now = Instant.parse("2026-09-22T15:00:00Z");
    private final UUID organizer = UUID.randomUUID();
    private SportsMatch match;
    private ManualMatchParticipantService service;

    @BeforeEach
    void setup() {
        match =
                SportsMatch.restore(
                        UUID.randomUUID(),
                        "partido-manual",
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        organizer,
                        "Partido manual",
                        "FOOTBALL",
                        "FOOTBALL_7",
                        SkillLevel.INTERMEDIATE,
                        6,
                        10,
                        true,
                        1200,
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
                new ManualMatchParticipantService(
                        matches,
                        participants,
                        manualParticipants,
                        events,
                        Clock.fixed(now, ZoneOffset.UTC));
    }

    @Test
    void organizerAddsAPaidDirectParticipantWhenCapacityIsAvailable() {
        when(matches.findByIdForUpdate(match.id())).thenReturn(Optional.of(match));
        when(participants.countByMatchAndStatus(match.id(), MatchParticipantStatus.JOINED))
                .thenReturn(2L);
        when(manualParticipants.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var result = service.add(organizer, match.id(), "  Luis   Pérez ", "987 654 321", true);

        assertThat(result.displayName()).isEqualTo("Luis Pérez");
        assertThat(result.paymentStatus()).isEqualTo("PAID_DIRECT");
        assertThat(result.paidMinor()).isEqualTo(1200);
        verify(events).publishEvent(any(MatchAuditEvent.class));
    }

    @Test
    void anotherUserCannotAddAParticipant() {
        when(matches.findByIdForUpdate(match.id())).thenReturn(Optional.of(match));

        assertThatThrownBy(
                        () -> service.add(UUID.randomUUID(), match.id(), "Luis Pérez", null, false))
                .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(participants, manualParticipants, events);
    }

    @Test
    void capacityCannotBeExceeded() {
        when(matches.findByIdForUpdate(match.id())).thenReturn(Optional.of(match));
        when(participants.countByMatchAndStatus(match.id(), MatchParticipantStatus.JOINED))
                .thenReturn(9L);

        assertThatThrownBy(() -> service.add(organizer, match.id(), "Luis Pérez", null, false))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("no tiene cupos");
        verify(manualParticipants, never()).save(any());
    }

    @Test
    void organizerCanMarkAManualParticipantAsPaidLater() {
        var participant =
                ManualMatchParticipant.create(
                        match.organizationId(),
                        match.id(),
                        "Luis Pérez",
                        "987654321",
                        false,
                        match.priceMinor(),
                        organizer,
                        now.minusSeconds(60));
        when(matches.findByIdForUpdate(match.id())).thenReturn(Optional.of(match));
        when(manualParticipants.findById(participant.id())).thenReturn(Optional.of(participant));
        when(manualParticipants.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var result = service.updatePayment(organizer, match.id(), participant.id(), true);

        assertThat(result.paymentStatus()).isEqualTo("PAID_DIRECT");
        assertThat(result.paidMinor()).isEqualTo(1200);
        assertThat(result.paidAt()).isEqualTo(now);
        verify(events).publishEvent(any(MatchAuditEvent.class));
    }

    @Test
    void anotherUserCannotChangeAManualPayment() {
        when(matches.findByIdForUpdate(match.id())).thenReturn(Optional.of(match));

        assertThatThrownBy(
                        () ->
                                service.updatePayment(
                                        UUID.randomUUID(), match.id(), UUID.randomUUID(), true))
                .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(manualParticipants, events);
    }
}
