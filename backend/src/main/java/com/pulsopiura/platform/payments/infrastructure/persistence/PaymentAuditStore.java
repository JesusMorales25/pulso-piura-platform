package com.pulsopiura.platform.payments.infrastructure.persistence;

import java.time.Instant;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class PaymentAuditStore {
    private final JdbcTemplate jdbc;

    public PaymentAuditStore(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void append(
            UUID order,
            String previous,
            String status,
            UUID actor,
            String correlation,
            Instant now) {
        jdbc.update(
                "insert into app.payment_status_history(id,payment_order_id,previous_status,new_status,actor_user_id,correlation_id,occurred_at) values(?,?,?,?,?,?,?)",
                UUID.randomUUID(),
                order,
                previous,
                status,
                actor,
                correlation,
                java.sql.Timestamp.from(now));
    }
}
