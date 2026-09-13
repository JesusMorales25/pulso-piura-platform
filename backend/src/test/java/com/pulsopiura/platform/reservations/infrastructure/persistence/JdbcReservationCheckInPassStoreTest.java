package com.pulsopiura.platform.reservations.infrastructure.persistence;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class JdbcReservationCheckInPassStoreTest {
    @Test
    void bindsInstantValuesAsPostgresCompatibleTimestamps() {
        var jdbc = mock(JdbcTemplate.class);
        var store = new JdbcReservationCheckInPassStore(jdbc);
        var reservationId = UUID.randomUUID();
        var organizationId = UUID.randomUUID();
        var actorId = UUID.randomUUID();
        var issuedAt = Instant.parse("2026-09-10T16:00:00Z");
        var validUntil = Instant.parse("2026-09-11T04:00:00Z");
        var consumedAt = Instant.parse("2026-09-10T17:00:00Z");
        var hash = "a".repeat(64);
        when(jdbc.update(anyString(), eq(Timestamp.from(consumedAt)), eq(actorId), eq(hash)))
                .thenReturn(1);

        store.issue(reservationId, organizationId, hash, issuedAt, validUntil);
        store.consume(hash, actorId, consumedAt);

        verify(jdbc)
                .update(
                        anyString(),
                        eq(reservationId),
                        eq(organizationId),
                        eq(hash),
                        eq(Timestamp.from(issuedAt)),
                        eq(Timestamp.from(validUntil)));
        verify(jdbc).update(anyString(), eq(Timestamp.from(consumedAt)), eq(actorId), eq(hash));
    }
}
