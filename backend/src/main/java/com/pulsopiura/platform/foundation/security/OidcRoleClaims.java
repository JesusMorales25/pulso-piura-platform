package com.pulsopiura.platform.foundation.security;

import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

/**
 * Normalizes global roles emitted by supported OIDC providers. Contextual organization permissions
 * remain in the product database and are not inferred from these claims.
 */
@Component
public class OidcRoleClaims {
    private final String configuredRolesClaim;
    private final String platformAdminEmail;
    private final OidcUserClaims userClaims;

    public OidcRoleClaims(
            @Value("${app.security.roles-claim:}") String configuredRolesClaim,
            @Value("${app.security.platform-admin-email:}") String platformAdminEmail,
            OidcUserClaims userClaims) {
        this.configuredRolesClaim = normalize(configuredRolesClaim);
        this.platformAdminEmail = normalizeEmail(platformAdminEmail);
        this.userClaims = userClaims;
    }

    public Set<String> roles(Jwt jwt) {
        var roles = new LinkedHashSet<String>();
        addClaimRoles(roles, jwt.getClaim(configuredRolesClaim));
        addClaimRoles(roles, jwt.getClaim("roles"));

        Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
        if (realmAccess != null) addClaimRoles(roles, realmAccess.get("roles"));

        if (isConfiguredPlatformAdmin(jwt)) roles.add("PLATFORM_ADMIN");
        return Set.copyOf(roles);
    }

    public boolean isPlatformAdmin(Jwt jwt) {
        return roles(jwt).contains("PLATFORM_ADMIN");
    }

    private boolean isConfiguredPlatformAdmin(Jwt jwt) {
        if (platformAdminEmail.isEmpty()) return false;
        if (!userClaims.emailVerified(jwt)) return false;
        return platformAdminEmail.equals(normalizeEmail(userClaims.email(jwt)));
    }

    private void addClaimRoles(Set<String> target, Object claim) {
        if (claim instanceof Collection<?> values) {
            values.stream()
                    .filter(String.class::isInstance)
                    .map(String.class::cast)
                    .map(String::trim)
                    .filter(value -> !value.isEmpty())
                    .forEach(target::add);
        }
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private static String normalizeEmail(String value) {
        return normalize(value).toLowerCase(Locale.ROOT);
    }
}
