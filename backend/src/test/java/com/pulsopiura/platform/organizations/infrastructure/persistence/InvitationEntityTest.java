package com.pulsopiura.platform.organizations.infrastructure.persistence;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.pulsopiura.platform.organizations.domain.OrganizationRole;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

class InvitationEntityTest {
    @Test
    void rejectsAcceptanceByAnotherEmail() {
        var invitation =
                InvitationEntity.create(
                        UUID.randomUUID(),
                        "operador@complejo.pe",
                        OrganizationRole.OPERATOR,
                        UUID.randomUUID(),
                        Instant.parse("2026-09-03T12:00:00Z"));

        assertThatThrownBy(
                        () ->
                                invitation.accept(
                                        UUID.randomUUID(),
                                        "intruso@otro.pe",
                                        Instant.parse("2026-09-03T13:00:00Z")))
                .isInstanceOf(AccessDeniedException.class);
    }
}
