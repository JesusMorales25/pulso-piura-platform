package com.pulsopiura.platform.identity.infrastructure.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import org.junit.jupiter.api.Test;

class UserEntityTest {
    @Test
    void derivesAReadableNameFromEmailWhenOidcDoesNotProvideOne() {
        var user =
                UserEntity.create(
                        "auth0|user",
                        "maria.lopez@example.com",
                        true,
                        null,
                        Instant.parse("2026-09-22T15:00:00Z"));

        assertThat(user.displayName()).isEqualTo("Maria Lopez");
    }
}
