package com.pulsopiura.platform.matches.application;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.pulsopiura.platform.reservations.application.ReservationConflictException;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

class MatchCheckInServiceTest {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final Instant now = Instant.parse("2026-10-24T18:00:00Z");
    private final UUID actor = UUID.randomUUID();
    private final UUID match = UUID.randomUUID();
    private final UUID participant = UUID.randomUUID();
    private final ResultSet row = mock(ResultSet.class);
    private final MatchCheckInService service =
            new MatchCheckInService(jdbc, Clock.fixed(now, ZoneOffset.UTC));

    @BeforeEach
    @SuppressWarnings({"unchecked", "rawtypes"})
    void setup() throws Exception {
        when(row.getObject("participant_id", UUID.class)).thenReturn(participant);
        when(row.getObject("match_id", UUID.class)).thenReturn(match);
        when(row.getString("participation_status")).thenReturn("JOINED");
        when(row.getString("match_status")).thenReturn("PUBLISHED");
        when(row.getTimestamp("starts_at")).thenReturn(Timestamp.from(now.minusSeconds(3600)));
        when(row.getTimestamp("ends_at")).thenReturn(Timestamp.from(now.plusSeconds(3600)));
        when(row.getTimestamp("valid_until")).thenReturn(Timestamp.from(now.plusSeconds(3600)));
        doAnswer(call -> List.of(((RowMapper) call.getArgument(1)).mapRow(row, 0)))
                .when(jdbc)
                .query(anyString(), any(RowMapper.class), any(Object[].class));
        doAnswer(
                        call -> {
                            assertThat(call.getArguments())
                                    .as(
                                            "PostgreSQL JDBC parameters must not contain unsupported Instant values")
                                    .noneMatch(Instant.class::isInstance);
                            return 1;
                        })
                .when(jdbc)
                .update(anyString(), any(Object[].class));
    }

    @Test
    void issuesAndRegeneratesAnOpaquePassWithPostgresCompatibleDates() {
        var first = service.issue(actor, "test-match");
        var second = service.issue(actor, "test-match");
        assertThat(first.participantId()).isEqualTo(participant);
        assertThat(first.payload()).startsWith("PULSO-MATCH:").isNotEqualTo(second.payload());
        assertThat(first.issuedAt()).isEqualTo(now);
        assertThat(first.validUntil()).isEqualTo(now.plusSeconds(3600));
        verify(jdbc, times(2))
                .update(
                        anyString(),
                        eq(participant),
                        anyString(),
                        eq(Timestamp.from(now)),
                        eq(Timestamp.from(now.plusSeconds(3600))));
    }

    @Test
    void organizerCheckInUsesPostgresCompatibleDates() {
        var result = service.checkIn(actor, match, "PULSO-MATCH:" + "a".repeat(43));
        assertThat(result.checkedInAt()).isEqualTo(now);
        verify(jdbc)
                .update(
                        anyString(),
                        eq(Timestamp.from(now)),
                        eq(actor),
                        eq(participant),
                        eq(Timestamp.from(now)));
    }

    @Test
    void waitlistedPlayerCannotIssueAPass() throws Exception {
        when(row.getString("participation_status")).thenReturn("WAITLISTED");
        assertThatThrownBy(() -> service.issue(actor, "test-match"))
                .isInstanceOf(ReservationConflictException.class);
        verify(jdbc, never()).update(anyString(), any(Object[].class));
    }

    @Test
    void expiredMatchCannotIssueAPass() throws Exception {
        when(row.getTimestamp("ends_at")).thenReturn(Timestamp.from(now.minusSeconds(18000)));
        assertThatThrownBy(() -> service.issue(actor, "test-match"))
                .isInstanceOf(ReservationConflictException.class);
        verify(jdbc, never()).update(anyString(), any(Object[].class));
    }

    @Test
    @SuppressWarnings("unchecked")
    void missingParticipationCannotIssueAPass() {
        doReturn(List.of())
                .when(jdbc)
                .query(anyString(), any(RowMapper.class), any(Object[].class));
        assertThatThrownBy(() -> service.issue(actor, "test-match"))
                .isInstanceOf(NoSuchElementException.class);
        verify(jdbc, never()).update(anyString(), any(Object[].class));
    }

    @Test
    void dayBeforeAt235959InPiuraCannotIssueOrValidateAnOldPass() throws Exception {
        when(row.getTimestamp("starts_at"))
                .thenReturn(Timestamp.from(Instant.parse("2026-10-25T18:00:00Z")));
        when(row.getTimestamp("ends_at"))
                .thenReturn(Timestamp.from(Instant.parse("2026-10-25T19:00:00Z")));
        var before =
                new MatchCheckInService(
                        jdbc, Clock.fixed(Instant.parse("2026-10-25T04:59:59Z"), ZoneOffset.UTC));
        assertThatThrownBy(() -> before.issue(actor, "test-match"))
                .isInstanceOf(ReservationConflictException.class);
        assertThatThrownBy(() -> before.preview(actor, match, "a".repeat(43)))
                .isInstanceOf(ReservationConflictException.class);
        verify(jdbc, never()).update(anyString(), any(Object[].class));
    }

    @Test
    void exactlyMidnightInPiuraCanIssueAPass() throws Exception {
        when(row.getTimestamp("starts_at"))
                .thenReturn(Timestamp.from(Instant.parse("2026-10-25T18:00:00Z")));
        when(row.getTimestamp("ends_at"))
                .thenReturn(Timestamp.from(Instant.parse("2026-10-25T19:00:00Z")));
        var midnight =
                new MatchCheckInService(
                        jdbc, Clock.fixed(Instant.parse("2026-10-25T05:00:00Z"), ZoneOffset.UTC));
        assertThat(midnight.issue(actor, "test-match").validUntil())
                .isEqualTo(Instant.parse("2026-10-25T19:00:00Z"));
    }

    @Test
    void exactMatchEndRejectsIssuingAndScanningIncludingLegacyPasses() throws Exception {
        when(row.getTimestamp("ends_at")).thenReturn(Timestamp.from(now));
        when(row.getTimestamp("valid_until")).thenReturn(Timestamp.from(now.plusSeconds(14400)));
        assertThatThrownBy(() -> service.issue(actor, "test-match"))
                .isInstanceOf(ReservationConflictException.class);
        assertThatThrownBy(() -> service.preview(actor, match, "a".repeat(43)))
                .isInstanceOf(ReservationConflictException.class);
        assertThatThrownBy(() -> service.checkIn(actor, match, "a".repeat(43)))
                .isInstanceOf(ReservationConflictException.class);
        verify(jdbc, never()).update(anyString(), any(Object[].class));
    }

    @Test
    void cancelledMatchCannotValidateAPass() throws Exception {
        when(row.getString("match_status")).thenReturn("CANCELLED");
        assertThatThrownBy(() -> service.preview(actor, match, "a".repeat(43)))
                .isInstanceOf(ReservationConflictException.class);
        verify(jdbc, never()).update(anyString(), any(Object[].class));
    }
}
