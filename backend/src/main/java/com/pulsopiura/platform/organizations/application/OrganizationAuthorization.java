package com.pulsopiura.platform.organizations.application;

import com.pulsopiura.platform.organizations.domain.*;
import com.pulsopiura.platform.organizations.infrastructure.persistence.MembershipRepository;
import java.util.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

@Service
public class OrganizationAuthorization {
    private static final Map<OrganizationRole, Set<OrganizationPermission>> PERMISSIONS =
            Map.of(
                    OrganizationRole.OWNER, Set.of(OrganizationPermission.values()),
                    OrganizationRole.ADMIN,
                            Set.of(
                                    OrganizationPermission.VIEW,
                                    OrganizationPermission.MANAGE_ORGANIZATION,
                                    OrganizationPermission.MANAGE_MEMBERS,
                                    OrganizationPermission.OPERATE),
                    OrganizationRole.OPERATOR,
                            Set.of(OrganizationPermission.VIEW, OrganizationPermission.OPERATE));

    private final MembershipRepository memberships;

    public OrganizationAuthorization(MembershipRepository memberships) {
        this.memberships = memberships;
    }

    public OrganizationRole require(
            UUID actorId, UUID organizationId, OrganizationPermission permission) {
        var membership =
                memberships
                        .findByOrganizationIdAndUserIdAndStatus(organizationId, actorId, "ACTIVE")
                        .orElseThrow(
                                () -> new AccessDeniedException("Sin acceso a la organización"));
        if (!PERMISSIONS.getOrDefault(membership.role(), Set.of()).contains(permission)) {
            throw new AccessDeniedException("Permiso insuficiente en la organización");
        }
        return membership.role();
    }
}
