package com.pulsopiura.platform.matches.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.pulsopiura.platform.matches.application.MatchOrganizerQueryService.OrganizerIdentity;
import com.pulsopiura.platform.matches.application.MatchOrganizerQueryService.ParticipantView;
import com.pulsopiura.platform.matches.domain.*;
import com.pulsopiura.platform.matches.infrastructure.persistence.*;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

@ExtendWith(MockitoExtension.class)
class MatchOrganizerQueryServiceTest {
    @Mock MatchStore matches;
    @Mock JdbcTemplate jdbc;
    @Mock MatchJoinOrderRepository orders;
    final UUID organizer = UUID.randomUUID();
    final Instant now = Instant.parse("2026-09-08T20:00:00Z");
    MatchOrganizerQueryService service;

    @BeforeEach
    void setup() {
        service = new MatchOrganizerQueryService(matches, jdbc, orders);
    }

    @Test
    void playingOrganizerAppearsOnceAsUnpaidWithoutAnOrder() {
        var match = prepare(true, 1500);

        var result = service.participants(organizer, match.id());

        assertThat(result).singleElement().satisfies(this::assertOrganizer);
        assertThat(result.getFirst().paymentStatus()).isEqualTo("UNPAID");
        assertThat(result.getFirst().paidMinor()).isZero();
    }

    @Test
    void playingOrganizerShowsPendingOrder() {
        var match = prepare(true, 1500);
        when(orders.findFirstByMatchIdAndPayerUserIdAndStatusOrderByCreatedAtDesc(
                        match.id(), organizer, "PAID"))
                .thenReturn(Optional.empty());
        when(orders.findFirstByMatchIdAndPayerUserIdAndStatusOrderByCreatedAtDesc(
                        match.id(), organizer, "PENDING"))
                .thenReturn(Optional.of(pending(match, "pending")));

        var row = service.participants(organizer, match.id()).getFirst();

        assertThat(row.paymentStatus()).isEqualTo("PENDING");
        assertThat(row.paymentMethod()).isEqualTo("YAPE");
        assertThat(row.paidMinor()).isZero();
    }

    @Test
    void playingOrganizerShowsPaidAmountAndMethod() {
        var match = prepare(true, 1500);
        var paid = pending(match, "paid");
        paid.markPaid("SIM-ORGANIZER", now);
        when(orders.findFirstByMatchIdAndPayerUserIdAndStatusOrderByCreatedAtDesc(
                        match.id(), organizer, "PAID"))
                .thenReturn(Optional.of(paid));

        var row = service.participants(organizer, match.id()).getFirst();

        assertThat(row.paymentStatus()).isEqualTo("PAID");
        assertThat(row.paidMinor()).isEqualTo(1500);
        assertThat(row.paymentMethod()).isEqualTo("YAPE");
        assertThat(row.paidAt()).isEqualTo(now);
    }

    @Test
    void playingOrganizerNeedsNoPaymentInAFreeMatch() {
        var match = prepare(true, 0);

        var row = service.participants(organizer, match.id()).getFirst();

        assertThat(row.paymentStatus()).isEqualTo("NOT_REQUIRED");
        verifyNoInteractions(orders);
    }

    @Test
    void nonPlayingOrganizerDoesNotAppearInRoster() {
        var match = prepare(false, 1500);

        assertThat(service.participants(organizer, match.id())).isEmpty();
        verifyNoInteractions(orders);
    }

    private SportsMatch prepare(boolean organizerCounts, long priceMinor) {
        var match = match(organizerCounts, priceMinor);
        when(matches.findById(match.id())).thenReturn(Optional.of(match));
        lenient()
                .when(
                        jdbc.query(
                                contains("from app.match_participants"),
                                any(RowMapper.class),
                                eq(match.id())))
                .thenReturn(List.of());
        lenient()
                .when(
                        jdbc.query(
                                contains("from app.manual_match_participants"),
                                any(RowMapper.class),
                                eq(match.id())))
                .thenReturn(List.of());
        lenient()
                .when(jdbc.query(contains("where u.id = ?"), any(RowMapper.class), eq(organizer)))
                .thenReturn(
                        List.of(
                                new OrganizerIdentity(
                                        "Organizador Pulso",
                                        "organizador@pulso.test",
                                        "https://cdn.test/avatar.png")));
        lenient()
                .when(
                        orders.findFirstByMatchIdAndPayerUserIdAndStatusOrderByCreatedAtDesc(
                                match.id(), organizer, "PAID"))
                .thenReturn(Optional.empty());
        lenient()
                .when(
                        orders.findFirstByMatchIdAndPayerUserIdAndStatusOrderByCreatedAtDesc(
                                match.id(), organizer, "PENDING"))
                .thenReturn(Optional.empty());
        return match;
    }

    private void assertOrganizer(ParticipantView row) {
        assertThat(row.participantId()).isEqualTo(organizer);
        assertThat(row.userId()).isEqualTo(organizer);
        assertThat(row.source()).isEqualTo("ORGANIZER");
        assertThat(row.status()).isEqualTo("JOINED");
        assertThat(row.displayName()).isEqualTo("Organizador Pulso");
    }

    private MatchJoinOrderEntity pending(SportsMatch match, String key) {
        return MatchJoinOrderEntity.pending(
                match.organizationId(),
                match.id(),
                organizer,
                1500,
                MatchPaymentMethod.YAPE,
                key,
                now.plusSeconds(300),
                now.minusSeconds(30));
    }

    private SportsMatch match(boolean organizerCounts, long priceMinor) {
        return SportsMatch.restore(
                UUID.randomUUID(),
                "partido-organizador",
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                organizer,
                "Partido del organizador",
                "FOOTBALL",
                "FOOTBALL_7",
                SkillLevel.INTERMEDIATE,
                2,
                10,
                organizerCounts,
                priceMinor,
                MatchVisibility.PUBLIC,
                "Sin devoluciones",
                now.plusSeconds(7200),
                now.plusSeconds(10800),
                MatchStatus.PUBLISHED,
                now.minusSeconds(60),
                now.minusSeconds(120),
                now.minusSeconds(60),
                0);
    }
}
