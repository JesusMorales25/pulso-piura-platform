package com.pulsopiura.platform.matches.application;

import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MatchActivityQueryService {
    private final JdbcTemplate jdbc;

    public MatchActivityQueryService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public List<ActivityView> forPlayer(UUID actor) {
        return jdbc.query(
                """
            with player_matches as (
              select match_id from app.match_participants where user_id = ? and status <> 'WITHDRAWN'
              union
              select target_id from app.external_payment_proofs where target_type = 'MATCH' and payer_user_id = ?
            )
            select m.id, m.public_slug, m.title, m.sport_code, m.format_code,
                   s.name space_name, v.name venue_name, v.address venue_address,
                   m.starts_at, m.ends_at,
                   coalesce(p.status, case when m.organizer_user_id = ? and m.organizer_counts then 'JOINED' else 'PENDING_REVIEW' end) participation_status,
                   case when o.status = 'PAID' then 'PAID'
                     else coalesce(case when proof.status = 'PENDING_REVIEW' and proof.review_expires_at <= now() then 'NEEDS_RESOLUTION' else proof.status end,
                       o.status, case when m.price_minor = 0 then 'NOT_REQUIRED' else 'UNPAID' end) end payment_status,
                   case when o.status = 'PAID' then o.amount_minor else 0 end paid_minor,
                   m.currency, pass.consumed_at checked_in_at
            from player_matches pm
            join app.sports_matches m on m.id = pm.match_id
            join app.sport_spaces s on s.id = m.sport_space_id
            join app.venues v on v.id = s.venue_id
            left join app.match_participants p on p.match_id = m.id and p.user_id = ? and p.status <> 'WITHDRAWN'
            left join lateral (
              select status, amount_minor from app.match_join_orders jo
              where jo.match_id = m.id and jo.payer_user_id = ?
              order by (jo.status = 'PAID') desc, jo.created_at desc limit 1
            ) o on true
            left join lateral (
              select status, review_expires_at from app.external_payment_proofs ep
              where ep.target_type = 'MATCH' and ep.target_id = m.id and ep.payer_user_id = ?
              order by ep.created_at desc limit 1
            ) proof on true
            left join app.match_check_in_passes pass on pass.participant_id = p.id
            order by m.starts_at desc
            """,
                (rs, row) ->
                        new ActivityView(
                                rs.getObject("id", UUID.class),
                                rs.getString("public_slug"),
                                rs.getString("title"),
                                rs.getString("sport_code"),
                                rs.getString("format_code"),
                                rs.getString("space_name"),
                                rs.getString("venue_name"),
                                rs.getString("venue_address"),
                                rs.getTimestamp("starts_at").toInstant(),
                                rs.getTimestamp("ends_at").toInstant(),
                                rs.getString("participation_status"),
                                rs.getString("payment_status"),
                                rs.getLong("paid_minor"),
                                rs.getString("currency"),
                                timestamp(rs, "checked_in_at")),
                actor,
                actor,
                actor,
                actor,
                actor,
                actor);
    }

    public record ActivityView(
            UUID id,
            String publicSlug,
            String title,
            String sportCode,
            String formatCode,
            String spaceName,
            String venueName,
            String venueAddress,
            Instant startsAt,
            Instant endsAt,
            String participationStatus,
            String paymentStatus,
            long paidMinor,
            String currency,
            Instant checkedInAt) {}

    private static Instant timestamp(java.sql.ResultSet result, String column)
            throws java.sql.SQLException {
        var value = result.getTimestamp(column);
        return value == null ? null : value.toInstant();
    }
}
