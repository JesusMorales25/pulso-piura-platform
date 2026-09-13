import type { User } from "oidc-client-ts";
import { realmRoles } from "@/lib/auth-roles";

export type OrganizationRole = "OWNER" | "ADMIN" | "OPERATOR";

export type OrganizationMembership = {
  id: string;
  name: string;
  role: OrganizationRole;
};

export type UserCapabilities = {
  canBrowseVenues: boolean;
  canReserve: boolean;
  canJoinMatches: boolean;
  canCreateMatches: boolean;
  canOperateOrganizations: boolean;
  canManageOrganizations: boolean;
  canManagePlatform: boolean;
};

/**
 * Maps authenticated context to UI capabilities. This improves discoverability only:
 * Spring Security and contextual authorization remain the security authority.
 */
export function resolveCapabilities(
  user: User | null,
  memberships: OrganizationMembership[],
  organizerApproved = false,
  venueOwnerApproved = false,
): UserCapabilities {
  const authenticated = Boolean(user && !user.expired);
  const roles = realmRoles(user);
  const organizationRoles = new Set(
    memberships.map((membership) => membership.role),
  );

  return {
    canBrowseVenues: true,
    canReserve: authenticated,
    canJoinMatches: authenticated,
    canCreateMatches:
      authenticated &&
      (organizerApproved ||
        roles.has("CAPTAIN") ||
        roles.has("TOURNAMENT_ORGANIZER")),
    canOperateOrganizations:
      authenticated &&
      (venueOwnerApproved ||
        (["OWNER", "ADMIN", "OPERATOR"] as const).some((role) =>
          organizationRoles.has(role),
        )),
    canManageOrganizations:
      authenticated &&
      (venueOwnerApproved ||
        (["OWNER", "ADMIN"] as const).some((role) => organizationRoles.has(role))),
    canManagePlatform: authenticated && roles.has("PLATFORM_ADMIN"),
  };
}
