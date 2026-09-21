import type { User } from "oidc-client-ts";

type RealmAccess = { roles?: unknown };
type TokenClaims = Record<string, unknown> & { realm_access?: RealmAccess; roles?: unknown };

const configuredRolesClaim =
  process.env.NEXT_PUBLIC_OIDC_ROLES_CLAIM ?? "https://pulsopiura.app/roles";

function roleNames(value: RealmAccess | undefined): string[] {
  if (!Array.isArray(value?.roles)) return [];
  return value.roles.filter(
    (role): role is string => typeof role === "string" && role.length > 0,
  );
}

function directRoleNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
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
 * Reads global roles from Keycloak and from a configurable OIDC claim used by
 * providers such as Auth0. The API still validates the signed token and remains
 * the authorization authority.
 */
export function realmRoles(user: User | null): Set<string> {
  const profile = user?.profile as TokenClaims | undefined;
  const token = accessTokenClaims(user?.access_token);
  return new Set([
    ...roleNames(profile?.realm_access),
    ...roleNames(token.realm_access),
    ...directRoleNames(profile?.roles),
    ...directRoleNames(token.roles),
    ...directRoleNames(profile?.[configuredRolesClaim]),
    ...directRoleNames(token[configuredRolesClaim]),
  ]);
}

export function hasRealmRole(user: User | null, role: string): boolean {
  return Boolean(user && !user.expired && realmRoles(user).has(role));
}
