package com.pulsopiura.platform.identity.infrastructure.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.pulsopiura.platform.identity.domain.CapabilityType;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class CapabilityRequestEntityTest {
    @Test
    void approvedCapabilityCanBeRevokedOnlyOnce() {
        var now = Instant.parse("2026-09-09T12:00:00Z");
        var reviewer = UUID.randomUUID();
        var request =
                CapabilityRequestEntity.pending(
                        UUID.randomUUID(), CapabilityType.MATCH_ORGANIZER, "Motivo", now);

        request.review("APPROVED", reviewer, "Verificado", now.plusSeconds(10));
        request.revoke(reviewer, "Retirado", now.plusSeconds(20));

        assertThat(request.status()).isEqualTo("REVOKED");
        assertThatThrownBy(() -> request.revoke(reviewer, "Segundo intento", now.plusSeconds(30)))
                .isInstanceOf(IllegalStateException.class);
    }
}
