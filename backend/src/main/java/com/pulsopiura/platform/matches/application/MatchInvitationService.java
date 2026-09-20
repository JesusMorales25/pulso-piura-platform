package com.pulsopiura.platform.matches.application;

import com.pulsopiura.platform.audit.infrastructure.persistence.AuditEventEntity;
import com.pulsopiura.platform.audit.infrastructure.persistence.AuditEventRepository;
import com.pulsopiura.platform.matches.domain.MatchStatus;
import com.pulsopiura.platform.matches.infrastructure.persistence.*;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MatchInvitationService {
    private final MatchStore matches;
    private final MatchInvitationRepository invitations;
    private final AuditEventRepository auditEvents;
    private final Clock clock;

    @Autowired
    public MatchInvitationService(
            MatchStore matches,
            MatchInvitationRepository invitations,
            AuditEventRepository auditEvents) {
        this(matches, invitations, auditEvents, Clock.systemUTC());
    }

    MatchInvitationService(
            MatchStore matches,
            MatchInvitationRepository invitations,
            AuditEventRepository auditEvents,
            Clock clock) {
        this.matches = matches;
        this.invitations = invitations;
        this.auditEvents = auditEvents;
        this.clock = clock;
    }

    @Transactional
    public InvitationView invite(UUID actorId, UUID matchId, String email) {
        var match = requireOwnedMatchForUpdate(actorId, matchId);
        var now = clock.instant();
        if (match.status() != MatchStatus.PUBLISHED)
            throw new IllegalStateException("Publica el partido antes de invitar jugadores");
        if (!now.isBefore(match.startsAt()))
            throw new IllegalStateException("El partido ya inició");
        var existing =
                invitations.findByMatchIdAndEmailIgnoreCaseAndStatus(
                        matchId, email.trim(), "PENDING");
        if (existing.isPresent()) return view(existing.get());
        var expiresAt = now.plus(Duration.ofDays(7));
        if (expiresAt.isAfter(match.startsAt())) expiresAt = match.startsAt();
        var saved =
                invitations.saveAndFlush(
                        MatchInvitationEntity.pending(
                                match.organizationId(),
                                match.id(),
                                email,
                                actorId,
                                expiresAt,
                                now));
        auditEvents.save(
                AuditEventEntity.resourceAction(
                        actorId,
                        match.organizationId(),
                        "MATCH_INVITATION_CREATED",
                        "MATCH_INVITATION",
                        saved.id()));
        return view(saved);
    }

    @Transactional(readOnly = true)
    public List<InvitationView> list(UUID actorId, UUID matchId) {
        requireOwnedMatch(actorId, matchId);
        return invitations.findAllByMatchIdOrderByInvitedAtDesc(matchId).stream()
                .map(MatchInvitationService::view)
                .toList();
    }

    @Transactional
    public AcceptanceView accept(
            UUID actorId, String authenticatedEmail, boolean emailVerified, UUID invitationId) {
        var invitation =
                invitations
                        .findForUpdateById(invitationId)
                        .orElseThrow(() -> new NoSuchElementException("Invitación no encontrada"));
        var match =
                matches.findById(invitation.matchId())
                        .orElseThrow(() -> new NoSuchElementException("Partido no encontrado"));
        var now = clock.instant();
        if (match.status() != MatchStatus.PUBLISHED || !now.isBefore(match.startsAt()))
            throw new IllegalStateException("El partido ya no acepta invitaciones");
        invitation.accept(actorId, authenticatedEmail, emailVerified, now);
        var saved = invitations.saveAndFlush(invitation);
        auditEvents.save(
                AuditEventEntity.resourceAction(
                        actorId,
                        match.organizationId(),
                        "MATCH_INVITATION_ACCEPTED",
                        "MATCH_INVITATION",
                        saved.id()));
        return new AcceptanceView(saved.id(), match.publicSlug(), saved.status());
    }

    @Transactional
    public void revoke(UUID actorId, UUID matchId, UUID invitationId) {
        var match = requireOwnedMatch(actorId, matchId);
        var invitation =
                invitations
                        .findForUpdateById(invitationId)
                        .filter(item -> item.matchId().equals(matchId))
                        .orElseThrow(() -> new NoSuchElementException("Invitación no encontrada"));
        invitation.revoke(clock.instant());
        invitations.saveAndFlush(invitation);
        auditEvents.save(
                AuditEventEntity.resourceAction(
                        actorId,
                        match.organizationId(),
                        "MATCH_INVITATION_REVOKED",
                        "MATCH_INVITATION",
                        invitation.id()));
    }

    private com.pulsopiura.platform.matches.domain.SportsMatch requireOwnedMatch(
            UUID actorId, UUID matchId) {
        return matches.findById(matchId)
                .filter(match -> match.organizerUserId().equals(actorId))
                .orElseThrow(() -> new NoSuchElementException("Partido no encontrado"));
    }

    private com.pulsopiura.platform.matches.domain.SportsMatch requireOwnedMatchForUpdate(
            UUID actorId, UUID matchId) {
        return matches.findByIdForUpdate(matchId)
                .filter(match -> match.organizerUserId().equals(actorId))
                .orElseThrow(() -> new NoSuchElementException("Partido no encontrado"));
    }

    private static InvitationView view(MatchInvitationEntity invitation) {
        return new InvitationView(
                invitation.id(),
                invitation.matchId(),
                invitation.email(),
                invitation.status(),
                invitation.expiresAt(),
                invitation.acceptedAt());
    }

    public record InvitationView(
            UUID id,
            UUID matchId,
            String email,
            String status,
            Instant expiresAt,
            Instant acceptedAt) {}

    public record AcceptanceView(UUID invitationId, String publicSlug, String status) {}
}
