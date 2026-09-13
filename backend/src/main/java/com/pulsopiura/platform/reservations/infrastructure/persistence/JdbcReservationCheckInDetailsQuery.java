package com.pulsopiura.platform.reservations.infrastructure.persistence;

import com.pulsopiura.platform.reservations.application.port.ReservationCheckInDetailsQuery;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class JdbcReservationCheckInDetailsQuery implements ReservationCheckInDetailsQuery {
    private final JdbcTemplate jdbc;

    JdbcReservationCheckInDetailsQuery(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Details get(UUID reservationId) {
        return jdbc.queryForObject(
                """
                select v.name as venue_name,
                       s.name as space_name,
                       coalesce(nullif(p.preferred_display_name, ''), u.display_name) as customer_name,
                       u.email as customer_email
                from app.reservations r
                join app.sport_spaces s on s.id=r.sport_space_id
                join app.venues v on v.id=s.venue_id
                join app.users u on u.id=r.customer_user_id
                left join app.player_profiles p on p.user_id=u.id
                where r.id=?
                """,
                (row, index) ->
                        new Details(
                                row.getString("venue_name"),
                                row.getString("space_name"),
                                row.getString("customer_name"),
                                row.getString("customer_email")),
                reservationId);
    }
}
