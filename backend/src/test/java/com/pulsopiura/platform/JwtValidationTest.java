package com.pulsopiura.platform;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;

class JwtValidationTest {
    @Test
    void rejectsTokenForAnotherAudience() {
        var jwt =
                Jwt.withTokenValue("token")
                        .header("alg", "RS256")
                        .subject("user-1")
                        .audience(java.util.List.of("another-api"))
                        .issuedAt(Instant.now())
                        .expiresAt(Instant.now().plusSeconds(60))
                        .build();
        var validator =
                new JwtClaimValidator<java.util.List<String>>(
                        "aud", aud -> aud.contains("pulso-api"));
        assertThat(validator.validate(jwt).hasErrors()).isTrue();
    }
}
