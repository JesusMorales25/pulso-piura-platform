import type { User } from "oidc-client-ts";

type RealmAccess = { roles?: unknown };
type TokenClaims = { realm_access?: RealmAccess };

function roleNames(value: RealmAccess | undefined): string[] {
  if (!Array.isArray(value?.roles)) return [];
  return value.roles.filter(
    (role): role is string => typeof role === "string" && role.length > 0,
  );
}

function accessTokenClaims(accessToken: string | undefined): TokenClaims {
  if (!accessToken) return {};
  const parts = accessToken.split(".");
  if (parts.length !== 3) return {};
  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );
    const claims: unknown = JSON.parse(atob(padded));
    return claims && typeof claims === "object" ? (claims as TokenClaims) : {};
  } catch {
    return {};
  }
}

/**
 * Reads roles from the access token, where Keycloak publishes authorization
 * claims, and keeps ID-token claims as a compatibility fallback. The API still
 * validates the signed token and remains the authorization authority.
 */
export function realmRoles(user: User | null): Set<string> {
  const profileRoles = roleNames(
    (user?.profile as { realm_access?: RealmAccess } | undefined)?.realm_access,
  );
  const tokenRoles = roleNames(accessTokenClaims(user?.access_token).realm_access);
  return new Set([...profileRoles, ...tokenRoles]);
}

export function hasRealmRole(user: User | null, role: string): boolean {
  return Boolean(user && !user.expired && realmRoles(user).has(role));
}
