package com.pulsopiura.platform.organizations.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

import com.pulsopiura.platform.organizations.domain.OrganizationPermission;
import com.pulsopiura.platform.organizations.domain.OrganizationRole;
import com.pulsopiura.platform.organizations.infrastructure.persistence.MembershipEntity;
import com.pulsopiura.platform.organizations.infrastructure.persistence.MembershipRepository;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.security.access.AccessDeniedException;

class OrganizationAuthorizationTest {
    private final MembershipRepository memberships = mock(MembershipRepository.class);
    private final OrganizationAuthorization authorization =
            new OrganizationAuthorization(memberships);

    @Test
    void deniesAccessWhenActorHasNoActiveMembershipInRequestedTenant() {
        var actorId = UUID.randomUUID();
        var foreignOrganizationId = UUID.randomUUID();
        when(memberships.findByOrganizationIdAndUserIdAndStatus(
                        foreignOrganizationId, actorId, "ACTIVE"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(
                        () ->
                                authorization.require(
                                        actorId,
                                        foreignOrganizationId,
                                        OrganizationPermission.VIEW))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessage("Sin acceso a la organización");
    }

    @ParameterizedTest
    @EnumSource(OrganizationPermission.class)
    void ownerHasEveryOrganizationPermission(OrganizationPermission permission) {
        var actorId = UUID.randomUUID();
        var organizationId = UUID.randomUUID();
        activeMembership(organizationId, actorId, OrganizationRole.OWNER);

        assertThat(authorization.require(actorId, organizationId, permission))
                .isEqualTo(OrganizationRole.OWNER);
    }

    @Test
    void administratorCanManageMembers() {
        var actorId = UUID.randomUUID();
        var organizationId = UUID.randomUUID();
        activeMembership(organizationId, actorId, OrganizationRole.ADMIN);

        assertThat(
                        authorization.require(
                                actorId, organizationId, OrganizationPermission.MANAGE_MEMBERS))
                .isEqualTo(OrganizationRole.ADMIN);
    }

    @Test
    void operatorCanOperateButCannotManageMembers() {
        var actorId = UUID.randomUUID();
        var organizationId = UUID.randomUUID();
        activeMembership(organizationId, actorId, OrganizationRole.OPERATOR);

        assertThat(authorization.require(actorId, organizationId, OrganizationPermission.OPERATE))
                .isEqualTo(OrganizationRole.OPERATOR);
        assertThatThrownBy(
                        () ->
                                authorization.require(
                                        actorId,
                                        organizationId,
                                        OrganizationPermission.MANAGE_MEMBERS))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessage("Permiso insuficiente en la organización");
    }

    private void activeMembership(
            UUID organizationId, UUID actorId, OrganizationRole organizationRole) {
        var membership =
                MembershipEntity.create(
                        organizationId,
                        actorId,
                        organizationRole,
                        Instant.parse("2026-09-04T00:00:00Z"));
        when(memberships.findByOrganizationIdAndUserIdAndStatus(organizationId, actorId, "ACTIVE"))
                .thenReturn(Optional.of(membership));
    }
}
