package com.pulsopiura.platform.reservations.infrastructure.persistence;

import com.pulsopiura.platform.reservations.application.port.ReservationTimelineQuery;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class JdbcReservationTimelineQuery implements ReservationTimelineQuery {
    private final JdbcTemplate jdbc;

    JdbcReservationTimelineQuery(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Event> list(UUID reservationId) {
        return jdbc.query(
                "select id,previous_status,new_status,occurred_at from app.reservation_status_history where reservation_id=? order by occurred_at desc,id desc",
                (row, index) ->
                        new Event(
                                row.getObject("id", UUID.class),
                                row.getString("previous_status"),
                                row.getString("new_status"),
                                row.getTimestamp("occurred_at").toInstant()),
                reservationId);
    }
}
