package com.pulsopiura.platform.foundation.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/** Atomic PostgreSQL counter shared by every API instance; never stores a raw subject or token. */
@Service
public class SharedWriteRateLimit {
    private final JdbcTemplate jdbc;
    private final int limit;

    public SharedWriteRateLimit(
            JdbcTemplate jdbc, @Value("${app.security.write-limit-per-minute:60}") int limit) {
        if (limit < 1)
            throw new IllegalArgumentException("El límite de escrituras debe ser positivo");
        this.jdbc = jdbc;
        this.limit = limit;
    }

    public boolean allow(String issuer, String subject) {
        var window = Instant.now().getEpochSecond() / 60;
        var attempts =
                jdbc.queryForObject(
                        """
                insert into app.security_rate_windows(actor_hash, window_start, attempts) values (?, ?, 1)
                on conflict (actor_hash, window_start) do update
                set attempts = app.security_rate_windows.attempts + 1
                returning attempts
                """,
                        Integer.class,
                        hash(issuer + "\n" + subject),
                        window);
        return attempts != null && attempts <= limit;
    }

    @Scheduled(fixedDelay = 3600000)
    public void removeExpiredWindows() {
        jdbc.update(
                "delete from app.security_rate_windows where window_start < ?",
                Instant.now().getEpochSecond() / 60 - 1440);
    }

    private String hash(String value) {
        try {
            return HexFormat.of()
                    .formatHex(
                            MessageDigest.getInstance("SHA-256")
                                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 no está disponible", impossible);
        }
    }
}
