package com.pulsopiura.platform.foundation.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

class OidcRoleClaimsTest {
    private static final String ROLES_CLAIM = "https://pulsopiura.app/roles";

    @Test
    void readsKeycloakAndNamespacedOidcRoles() {
        var claims =
                new OidcRoleClaims(ROLES_CLAIM, "", new OidcUserClaims("https://pulsopiura.app"));
        var jwt =
                token(
                        Map.of(
                                "realm_access",
                                Map.of("roles", List.of("CAPTAIN")),
                                ROLES_CLAIM,
                                List.of("PLATFORM_ADMIN")));

        assertThat(claims.roles(jwt)).containsExactlyInAnyOrder("CAPTAIN", "PLATFORM_ADMIN");
    }

    @Test
    void grantsConfiguredAdminOnlyToTheVerifiedEmail() {
        var claims =
                new OidcRoleClaims(
                        ROLES_CLAIM,
                        "Admin@PulsoPiura.com",
                        new OidcUserClaims("https://pulsopiura.app"));

        assertThat(
                        claims.isPlatformAdmin(
                                token(
                                        Map.of(
                                                "email",
                                                "admin@pulsopiura.com",
                                                "email_verified",
                                                true))))
                .isTrue();
        assertThat(
                        claims.isPlatformAdmin(
                                token(
                                        Map.of(
                                                "email",
                                                "admin@pulsopiura.com",
                                                "email_verified",
                                                false))))
                .isFalse();
        assertThat(
                        claims.isPlatformAdmin(
                                token(
                                        Map.of(
                                                "email",
                                                "otra@pulsopiura.com",
                                                "email_verified",
                                                true))))
                .isFalse();
    }

    private Jwt token(Map<String, Object> claims) {
        var builder =
                Jwt.withTokenValue("test-token")
                        .header("alg", "RS256")
                        .subject("identity-subject")
                        .issuedAt(Instant.parse("2026-09-21T10:00:00Z"))
                        .expiresAt(Instant.parse("2026-09-21T11:00:00Z"));
        claims.forEach(builder::claim);
        return builder.build();
    }
}
