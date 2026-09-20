package com.pulsopiura.platform.identity.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.pulsopiura.platform.audit.infrastructure.persistence.AuditEventRepository;
import com.pulsopiura.platform.identity.domain.CapabilityType;
import com.pulsopiura.platform.identity.infrastructure.persistence.CapabilityRequestEntity;
import com.pulsopiura.platform.identity.infrastructure.persistence.CapabilityRequestRepository;
import com.pulsopiura.platform.identity.infrastructure.persistence.UserEntity;
import com.pulsopiura.platform.identity.infrastructure.persistence.UserRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

@ExtendWith(MockitoExtension.class)
class CapabilityRequestServiceTest {
    private static final Instant NOW = Instant.parse("2026-09-17T15:00:00Z");

    @Mock CapabilityRequestRepository requests;
    @Mock UserRepository users;
    @Mock AuditEventRepository auditEvents;

    private CapabilityRequestService service;

    @BeforeEach
    void setUp() {
        service =
                new CapabilityRequestService(
                        requests, users, auditEvents, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    void verifiedPlayerSelfActivatesAsMatchOrganizer() {
        var userId = UUID.randomUUID();
        allowUserLock(userId);
        when(requests.existsByUserIdAndCapabilityAndStatus(
                        userId, CapabilityType.MATCH_ORGANIZER, "REVOKED"))
                .thenReturn(false);
        when(requests.findByUserIdAndCapabilityAndStatus(
                        userId, CapabilityType.MATCH_ORGANIZER, "APPROVED"))
                .thenReturn(Optional.empty());
        when(requests.findByUserIdAndCapabilityAndStatus(
                        userId, CapabilityType.MATCH_ORGANIZER, "PENDING"))
                .thenReturn(Optional.empty());
        when(requests.saveAndFlush(any(CapabilityRequestEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var result = service.request(userId, CapabilityType.MATCH_ORGANIZER, null, true);

        assertThat(result.status()).isEqualTo("APPROVED");
        assertThat(result.reviewedAt()).isEqualTo(NOW);
        verify(auditEvents).save(any());
    }

    @Test
    void pendingOrganizerRequestIsApprovedWithoutAdminReview() {
        var userId = UUID.randomUUID();
        allowUserLock(userId);
        var pending =
                CapabilityRequestEntity.pending(
                        userId,
                        CapabilityType.MATCH_ORGANIZER,
                        "Solicitud anterior",
                        NOW.minusSeconds(30));
        when(requests.existsByUserIdAndCapabilityAndStatus(
                        userId, CapabilityType.MATCH_ORGANIZER, "REVOKED"))
                .thenReturn(false);
        when(requests.findByUserIdAndCapabilityAndStatus(
                        userId, CapabilityType.MATCH_ORGANIZER, "APPROVED"))
                .thenReturn(Optional.empty());
        when(requests.findByUserIdAndCapabilityAndStatus(
                        userId, CapabilityType.MATCH_ORGANIZER, "PENDING"))
                .thenReturn(Optional.of(pending));
        when(requests.saveAndFlush(pending)).thenReturn(pending);

        var result = service.request(userId, CapabilityType.MATCH_ORGANIZER, null, true);

        assertThat(result.status()).isEqualTo("APPROVED");
        verify(requests).saveAndFlush(pending);
    }

    @Test
    void unverifiedPlayerCannotActivateMatchOrganizer() {
        var userId = UUID.randomUUID();

        assertThatThrownBy(
                        () -> service.request(userId, CapabilityType.MATCH_ORGANIZER, null, false))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Verifica tu correo");
        verify(requests, never()).saveAndFlush(any());
    }

    @Test
    void revokedOrganizerCannotSelfActivateAgain() {
        var userId = UUID.randomUUID();
        allowUserLock(userId);
        when(requests.existsByUserIdAndCapabilityAndStatus(
                        userId, CapabilityType.MATCH_ORGANIZER, "REVOKED"))
                .thenReturn(true);

        assertThatThrownBy(
                        () -> service.request(userId, CapabilityType.MATCH_ORGANIZER, null, true))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("revocada");
    }

    @Test
    void venueOwnerStillRequiresPlatformReview() {
        var userId = UUID.randomUUID();
        when(requests.findByUserIdAndCapabilityAndStatus(
                        userId, CapabilityType.VENUE_OWNER, "PENDING"))
                .thenReturn(Optional.empty());
        when(requests.saveAndFlush(any(CapabilityRequestEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var result = service.request(userId, CapabilityType.VENUE_OWNER, "Tengo un complejo", true);

        assertThat(result.status()).isEqualTo("PENDING");
        assertThat(result.reviewedAt()).isNull();
        verify(auditEvents, never()).save(any());
    }

    private void allowUserLock(UUID userId) {
        when(users.findForUpdateById(userId))
                .thenReturn(
                        Optional.of(
                                UserEntity.create(
                                        "subject-" + userId,
                                        "jugador@pulsopiura.test",
                                        true,
                                        "Jugador",
                                        NOW)));
    }
}
