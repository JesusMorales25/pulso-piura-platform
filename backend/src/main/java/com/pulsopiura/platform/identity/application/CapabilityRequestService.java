package com.pulsopiura.platform.identity.application;

import com.pulsopiura.platform.audit.infrastructure.persistence.AuditEventEntity;
import com.pulsopiura.platform.audit.infrastructure.persistence.AuditEventRepository;
import com.pulsopiura.platform.identity.domain.CapabilityType;
import com.pulsopiura.platform.identity.infrastructure.persistence.*;
import java.time.Clock;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CapabilityRequestService {
    private final CapabilityRequestRepository requests;
    private final UserRepository users;
    private final AuditEventRepository auditEvents;
    private final Clock clock;

    @Autowired
    public CapabilityRequestService(
            CapabilityRequestRepository requests,
            UserRepository users,
            AuditEventRepository auditEvents) {
        this(requests, users, auditEvents, Clock.systemUTC());
    }

    CapabilityRequestService(
            CapabilityRequestRepository requests,
            UserRepository users,
            AuditEventRepository auditEvents,
            Clock clock) {
        this.requests = requests;
        this.users = users;
        this.auditEvents = auditEvents;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<CapabilityRequestView> listFor(UUID userId) {
        return requests.findAllByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(CapabilityRequestService::view)
                .toList();
    }

    @Transactional(readOnly = true)
    public boolean isApproved(UUID userId, CapabilityType capability) {
        return requests.existsByUserIdAndCapabilityAndStatus(userId, capability, "APPROVED");
    }

    @Transactional(readOnly = true)
    public List<CapabilityRequestView> listForPlatform() {
        return requests.findAllByOrderByCreatedAtDesc().stream()
                .map(CapabilityRequestService::view)
                .toList();
    }

    @Transactional
    public CapabilityRequestView request(
            UUID userId, CapabilityType capability, String reason, boolean emailVerified) {
        if (capability == CapabilityType.MATCH_ORGANIZER) {
            return activateMatchOrganizer(userId, emailVerified);
        }

        var cleanReason = cleanReason(reason);
        if (requests.findByUserIdAndCapabilityAndStatus(userId, capability, "PENDING")
                .isPresent()) {
            throw new IllegalStateException("Ya existe una solicitud pendiente para este perfil");
        }
        try {
            return view(
                    requests.saveAndFlush(
                            CapabilityRequestEntity.pending(
                                    userId, capability, cleanReason, clock.instant())));
        } catch (DataIntegrityViolationException duplicate) {
            throw new IllegalStateException("Ya existe una solicitud pendiente para este perfil");
        }
    }

    private CapabilityRequestView activateMatchOrganizer(UUID userId, boolean emailVerified) {
        if (!emailVerified) {
            throw new AccessDeniedException(
                    "Verifica tu correo antes de activar la organización de pichangas");
        }
        users.findForUpdateById(userId)
                .orElseThrow(() -> new java.util.NoSuchElementException("Usuario no encontrado"));
        if (requests.existsByUserIdAndCapabilityAndStatus(
                userId, CapabilityType.MATCH_ORGANIZER, "REVOKED")) {
            throw new AccessDeniedException(
                    "La capacidad de organizar pichangas fue revocada. Contacta al soporte");
        }

        var approved =
                requests.findByUserIdAndCapabilityAndStatus(
                        userId, CapabilityType.MATCH_ORGANIZER, "APPROVED");
        if (approved.isPresent()) return view(approved.get());

        var now = clock.instant();
        var request =
                requests.findByUserIdAndCapabilityAndStatus(
                                userId, CapabilityType.MATCH_ORGANIZER, "PENDING")
                        .orElseGet(
                                () ->
                                        requests.saveAndFlush(
                                                CapabilityRequestEntity.pending(
                                                        userId,
                                                        CapabilityType.MATCH_ORGANIZER,
                                                        "Activación solicitada por el jugador",
                                                        now)));
        request.review("APPROVED", userId, "Correo verificado; activación automática", now);
        var saved = requests.saveAndFlush(request);
        auditEvents.save(
                AuditEventEntity.capabilityRequestAction(
                        userId, "MATCH_ORGANIZER_SELF_ACTIVATED", saved.id()));
        return view(saved);
    }

    @Transactional
    public CapabilityRequestView review(
            UUID requestId, UUID reviewerId, String decision, String reviewNote) {
        var request =
                requests.findById(requestId)
                        .orElseThrow(
                                () ->
                                        new java.util.NoSuchElementException(
                                                "Solicitud no encontrada"));
        var now = clock.instant();
        request.review(decision, reviewerId, cleanReason(reviewNote), now);
        var saved = requests.saveAndFlush(request);
        auditEvents.save(
                AuditEventEntity.capabilityRequestAction(
                        reviewerId, "CAPABILITY_REQUEST_" + decision, requestId));
        return view(saved);
    }

    @Transactional
    public CapabilityRequestView revoke(UUID requestId, UUID reviewerId, String reviewNote) {
        var request =
                requests.findById(requestId)
                        .orElseThrow(
                                () ->
                                        new java.util.NoSuchElementException(
                                                "Solicitud no encontrada"));
        request.revoke(reviewerId, cleanReason(reviewNote), clock.instant());
        var saved = requests.saveAndFlush(request);
        auditEvents.save(
                AuditEventEntity.capabilityRequestAction(
                        reviewerId, "CAPABILITY_REQUEST_REVOKED", requestId));
        return view(saved);
    }

    private String cleanReason(String reason) {
        if (reason == null || reason.isBlank()) return null;
        var value = reason.trim();
        if (value.length() > 1000)
            throw new IllegalArgumentException("El motivo excede 1000 caracteres");
        return value;
    }

    private static CapabilityRequestView view(CapabilityRequestEntity request) {
        return new CapabilityRequestView(
                request.id(),
                request.userId(),
                request.capability().name(),
                request.status(),
                request.reason(),
                request.createdAt(),
                request.reviewedAt());
    }

    public record CapabilityRequestView(
            UUID id,
            UUID userId,
            String capability,
            String status,
            String reason,
            java.time.Instant createdAt,
            java.time.Instant reviewedAt) {}
}
