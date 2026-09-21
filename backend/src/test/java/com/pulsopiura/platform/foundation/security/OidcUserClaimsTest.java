package com.pulsopiura.platform.foundation.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

class OidcUserClaimsTest {
    @Test
    void fallsBackToNamespacedClaimsUsedByAuth0AccessTokens() {
        var claims = new OidcUserClaims("https://pulsopiura.app/");
        var jwt =
                Jwt.withTokenValue("test-token")
                        .header("alg", "RS256")
                        .subject("auth0|subject")
                        .issuedAt(Instant.parse("2026-09-21T10:00:00Z"))
                        .expiresAt(Instant.parse("2026-09-21T11:00:00Z"))
                        .claim("https://pulsopiura.app/email", "jugador@example.com")
                        .claim("https://pulsopiura.app/email_verified", true)
                        .claim("https://pulsopiura.app/name", "Jugador")
                        .claim("https://pulsopiura.app/picture", "https://example.com/avatar.png")
                        .build();

        assertThat(claims.email(jwt)).isEqualTo("jugador@example.com");
        assertThat(claims.emailVerified(jwt)).isTrue();
        assertThat(claims.name(jwt)).isEqualTo("Jugador");
        assertThat(claims.picture(jwt)).isEqualTo("https://example.com/avatar.png");
    }
}
