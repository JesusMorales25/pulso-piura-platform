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
            select m.id, m.public_slug, m.title, m.sport_code, m.format_code,
                   s.name space_name, v.name venue_name, v.address venue_address,
                   m.starts_at, m.ends_at, p.status participation_status,
                   coalesce(o.status, case when m.price_minor = 0 then 'NOT_REQUIRED' else 'UNPAID' end) payment_status,
                   coalesce(o.amount_minor, 0) paid_minor, m.currency
            from app.match_participants p
            join app.sports_matches m on m.id = p.match_id
            join app.sport_spaces s on s.id = m.sport_space_id
            join app.venues v on v.id = s.venue_id
            left join lateral (
              select status, amount_minor from app.match_join_orders jo
              where jo.match_id = p.match_id and jo.payer_user_id = p.user_id
              order by (jo.status = 'PAID') desc, jo.created_at desc limit 1
            ) o on true
            where p.user_id = ? and p.status <> 'WITHDRAWN'
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
                                rs.getString("currency")),
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
            String currency) {}
}
