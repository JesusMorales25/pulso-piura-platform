package com.pulsopiura.platform.matches.application;

import static org.assertj.core.api.Assertions.*;

import java.sql.DriverManager;
import java.sql.Timestamp;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

@EnabledIfSystemProperty(named = "runMatchDatabaseTests", matches = "true")
class MatchCheckInPostgresTest {
    @Test
    void postgresRejectsRawInstantAndPreservesUtcTimestamp() throws Exception {
        var url =
                System.getProperty(
                        "matchTestDatabaseUrl",
                        "jdbc:postgresql://127.0.0.1:15432/pulso_external_test");
        assertThat(url).matches("jdbc:postgresql://(127\\.0\\.0\\.1|localhost):[0-9]+/.*test.*");
        try (var connection = DriverManager.getConnection(url, "pulso_test", "")) {
            var jdbc = new JdbcTemplate(new SingleConnectionDataSource(connection, true));
            var instant = Instant.parse("2026-10-24T18:00:00Z");
            assertThatThrownBy(
                            () ->
                                    jdbc.queryForObject(
                                            "select ?::timestamptz", Timestamp.class, instant))
                    .isInstanceOf(DataAccessException.class);
            assertThat(
                            jdbc.queryForObject(
                                            "select ?::timestamptz",
                                            Timestamp.class,
                                            Timestamp.from(instant))
                                    .toInstant())
                    .isEqualTo(instant);
        }
    }
}
