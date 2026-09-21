package com.pulsopiura.platform.foundation.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

/** Reads user attributes from standard OIDC claims or an Auth0-safe namespaced claim. */
@Component
public class OidcUserClaims {
    private final String namespace;

    public OidcUserClaims(@Value("${app.security.claims-namespace:}") String namespace) {
        var normalized = namespace == null ? "" : namespace.trim();
        this.namespace =
                normalized.endsWith("/")
                        ? normalized.substring(0, normalized.length() - 1)
                        : normalized;
    }

    public String email(Jwt jwt) {
        return stringClaim(jwt, "email");
    }

    public boolean emailVerified(Jwt jwt) {
        var standard = jwt.getClaim("email_verified");
        if (standard instanceof Boolean value) return value;
        var namespaced = namespacedClaim(jwt, "email_verified");
        return namespaced instanceof Boolean value && value;
    }

    public String name(Jwt jwt) {
        return stringClaim(jwt, "name");
    }

    public String picture(Jwt jwt) {
        return stringClaim(jwt, "picture");
    }

    private String stringClaim(Jwt jwt, String name) {
        var standard = jwt.getClaimAsString(name);
        if (standard != null && !standard.isBlank()) return standard;
        var namespaced = namespacedClaim(jwt, name);
        return namespaced instanceof String value && !value.isBlank() ? value : null;
    }

    private Object namespacedClaim(Jwt jwt, String name) {
        return namespace.isEmpty() ? null : jwt.getClaim(namespace + "/" + name);
    }
}
