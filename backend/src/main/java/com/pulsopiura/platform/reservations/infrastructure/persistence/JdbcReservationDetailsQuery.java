package com.pulsopiura.platform.reservations.infrastructure.persistence;

import com.pulsopiura.platform.reservations.application.port.ReservationDetailsQuery;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class JdbcReservationDetailsQuery implements ReservationDetailsQuery {
    private final JdbcTemplate jdbc;

    JdbcReservationDetailsQuery(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Names names(UUID id) {
        return jdbc.queryForObject(
                "select v.name, s.name from app.reservations r join app.sport_spaces s on s.id=r.sport_space_id join app.venues v on v.id=s.venue_id where r.id=?",
                (row, index) -> new Names(row.getString(1), row.getString(2)),
                id);
    }

    public Summary summary(UUID organizationId) {
        return jdbc.queryForObject(
                """
            select count(*), count(*) filter (where r.status='CONFIRMED'),
            count(*) filter (where r.status in ('HOLD','PENDING_PAYMENT') and r.expires_at > now()),
            count(*) filter (where r.status='CANCELLED'), coalesce(sum(p.paid),0),
            coalesce(sum(case when r.status in ('CONFIRMED','COMPLETED') then greatest(r.total_minor-coalesce(p.paid,0),0) else 0 end),0),
            coalesce(sum(case when r.status='CANCELLED' then p.paid else 0 end),0)
            from app.reservations r left join
            (select reservation_id, sum(amount_minor) as paid from app.payment_orders where status='PAID' group by reservation_id) p on p.reservation_id=r.id
            where r.organization_id=?
            """,
                (row, index) ->
                        new Summary(
                                row.getLong(1),
                                row.getLong(2),
                                row.getLong(3),
                                row.getLong(4),
                                row.getLong(5),
                                row.getLong(6),
                                row.getLong(7)),
                organizationId);
    }
}
