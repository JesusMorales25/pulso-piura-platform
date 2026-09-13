package com.pulsopiura.platform.reservations.infrastructure.persistence;

import com.pulsopiura.platform.reservations.application.port.ReservationCheckInPassStore;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class JdbcReservationCheckInPassStore implements ReservationCheckInPassStore {
    private final JdbcTemplate jdbc;

    JdbcReservationCheckInPassStore(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void issue(
            UUID reservationId,
            UUID organizationId,
            String tokenHash,
            Instant issuedAt,
            Instant validUntil) {
        jdbc.update(
                """
                insert into app.reservation_check_in_passes
                  (reservation_id, organization_id, token_hash, issued_at, valid_until)
                values (?, ?, ?, ?, ?)
                on conflict (reservation_id) do update
                  set token_hash=excluded.token_hash,
                      issued_at=excluded.issued_at,
                      valid_until=excluded.valid_until,
                      consumed_at=null,
                      consumed_by=null
                """,
                reservationId,
                organizationId,
                tokenHash,
                Timestamp.from(issuedAt),
                Timestamp.from(validUntil));
    }

    @Override
    public Optional<PassRecord> findByTokenHash(String tokenHash) {
        return jdbc
                .query(
                        """
                        select reservation_id, organization_id, valid_until, consumed_at, consumed_by
                        from app.reservation_check_in_passes
                        where token_hash=?
                        """,
                        (row, index) ->
                                new PassRecord(
                                        row.getObject("reservation_id", UUID.class),
                                        row.getObject("organization_id", UUID.class),
                                        row.getTimestamp("valid_until").toInstant(),
                                        row.getTimestamp("consumed_at") == null
                                                ? null
                                                : row.getTimestamp("consumed_at").toInstant(),
                                        row.getObject("consumed_by", UUID.class)),
                        tokenHash)
                .stream()
                .findFirst();
    }

    @Override
    public boolean consume(String tokenHash, UUID actorUserId, Instant consumedAt) {
        return jdbc.update(
                        """
                        update app.reservation_check_in_passes
                        set consumed_at=?, consumed_by=?
                        where token_hash=? and consumed_at is null
                        """,
                        Timestamp.from(consumedAt),
                        actorUserId,
                        tokenHash)
                == 1;
    }
}
