package com.pulsopiura.platform.organizations.infrastructure.persistence;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.pulsopiura.platform.organizations.domain.OrganizationRole;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class MembershipEntityTest {
    @Test
    void ownerCannotBeRevoked() {
        var owner =
                MembershipEntity.owner(
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        Instant.parse("2026-09-03T12:00:00Z"));

        assertThatThrownBy(() -> owner.revoke(Instant.parse("2026-09-03T13:00:00Z")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("No se puede revocar al propietario");
    }

    @Test
    void activeOwnerCannotBeDowngradedByInvitation() {
        var owner =
                MembershipEntity.owner(
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        Instant.parse("2026-09-04T00:00:00Z"));

        assertThatThrownBy(() -> owner.reactivate(OrganizationRole.OPERATOR))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("El usuario ya es miembro activo");
    }
}
