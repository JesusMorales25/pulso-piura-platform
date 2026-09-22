package com.pulsopiura.platform.matches.application;

import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MatchOrganizerQueryService {
    private final MatchStore matches;
    private final JdbcTemplate jdbc;

    public MatchOrganizerQueryService(MatchStore matches, JdbcTemplate jdbc) {
        this.matches = matches;
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public List<ParticipantView> participants(UUID actor, UUID matchId) {
        var match =
                matches.findById(matchId)
                        .orElseThrow(() -> new NoSuchElementException("Partido no encontrado"));
        if (!match.organizerUserId().equals(actor))
            throw new AccessDeniedException("Solo el organizador puede ver los participantes");
        var registered =
                jdbc.query(
                        """
                select p.id participant_id, p.user_id,
                       coalesce(case when profile.visibility <> 'PRIVATE'
                                     then nullif(profile.preferred_display_name, '') end,
                                u.display_name) display_name,
                       u.email,
                       case when profile.visibility <> 'PRIVATE'
                            then coalesce(profile.avatar_url, u.avatar_url) end avatar_url,
                       p.status,
                       coalesce(o.status, case when m.price_minor = 0 then 'NOT_REQUIRED' else 'UNPAID' end) payment_status,
                       case when o.status = 'PAID' then o.amount_minor else 0 end paid_minor,
                       o.method payment_method, o.paid_at, p.joined_at, pass.consumed_at checked_in_at
                from app.match_participants p
                join app.users u on u.id = p.user_id
                join app.sports_matches m on m.id = p.match_id
                left join app.player_profiles profile on profile.user_id = p.user_id
                left join lateral (
                  select status, amount_minor, method, paid_at
                  from app.match_join_orders jo
                  where jo.match_id = p.match_id and jo.payer_user_id = p.user_id
                  order by (jo.status = 'PAID') desc, jo.created_at desc
                  limit 1
                ) o on true
                left join app.match_check_in_passes pass on pass.participant_id = p.id
                where p.match_id = ? and p.status <> 'WITHDRAWN'
                order by p.joined_at nulls last, u.display_name
                """,
                        (rs, row) -> {
                            var joinedAt = rs.getTimestamp("joined_at");
                            return new ParticipantView(
                                    rs.getObject("participant_id", UUID.class),
                                    rs.getObject("user_id", UUID.class),
                                    "ACCOUNT",
                                    rs.getString("display_name"),
                                    rs.getString("email"),
                                    rs.getString("avatar_url"),
                                    rs.getString("status"),
                                    rs.getString("payment_status"),
                                    rs.getLong("paid_minor"),
                                    rs.getString("payment_method"),
                                    timestamp(rs, "paid_at"),
                                    joinedAt == null ? null : joinedAt.toInstant(),
                                    timestamp(rs, "checked_in_at"));
                        },
                        matchId);
        var manual =
                jdbc.query(
                        """
                select id participant_id, display_name, phone, payment_status,
                       paid_minor, paid_at, created_at
                from app.manual_match_participants
                where match_id = ?
                order by created_at, id
                """,
                        (rs, row) ->
                                new ParticipantView(
                                        rs.getObject("participant_id", UUID.class),
                                        null,
                                        "MANUAL",
                                        rs.getString("display_name"),
                                        rs.getString("phone"),
                                        null,
                                        "JOINED",
                                        rs.getString("payment_status"),
                                        rs.getLong("paid_minor"),
                                        rs.getString("payment_status").equals("PAID_DIRECT")
                                                ? "DIRECTO"
                                                : null,
                                        timestamp(rs, "paid_at"),
                                        timestamp(rs, "created_at"),
                                        null),
                        matchId);
        var result = new ArrayList<ParticipantView>(registered.size() + manual.size());
        result.addAll(registered);
        result.addAll(manual);
        return List.copyOf(result);
    }

    public record ParticipantView(
            UUID participantId,
            UUID userId,
            String source,
            String displayName,
            String email,
            String avatarUrl,
            String status,
            String paymentStatus,
            long paidMinor,
            String paymentMethod,
            Instant paidAt,
            Instant joinedAt,
            Instant checkedInAt) {}

    private static Instant timestamp(java.sql.ResultSet result, String column)
            throws java.sql.SQLException {
        var value = result.getTimestamp(column);
        return value == null ? null : value.toInstant();
    }
}
