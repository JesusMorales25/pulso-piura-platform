package com.pulsopiura.platform.matches.infrastructure.persistence;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;

@Entity
@Table(name = "match_invitations", schema = "app")
public class MatchInvitationEntity {
    @Id private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "match_id", nullable = false)
    private UUID matchId;

    @Column(nullable = false, length = 320)
    private String email;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "invited_by", nullable = false)
    private UUID invitedBy;

    @Column(name = "invited_at", nullable = false)
    private Instant invitedAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "accepted_by")
    private UUID acceptedBy;

    @Column(name = "accepted_at")
    private Instant acceptedAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version private long version;

    protected MatchInvitationEntity() {}

    public static MatchInvitationEntity pending(
            UUID organizationId,
            UUID matchId,
            String email,
            UUID invitedBy,
            Instant expiresAt,
            Instant now) {
        var cleanEmail = normalizeEmail(email);
        if (!now.isBefore(expiresAt))
            throw new IllegalArgumentException("La invitación debe vencer antes del partido");
        var invitation = new MatchInvitationEntity();
        invitation.id = UUID.randomUUID();
        invitation.organizationId = organizationId;
        invitation.matchId = matchId;
        invitation.email = cleanEmail;
        invitation.status = "PENDING";
        invitation.invitedBy = invitedBy;
        invitation.invitedAt = now;
        invitation.expiresAt = expiresAt;
        invitation.updatedAt = now;
        return invitation;
    }

    public void accept(
            UUID actorId, String authenticatedEmail, boolean emailVerified, Instant now) {
        if (!emailVerified)
            throw new AccessDeniedException("Verifica tu correo para aceptar la invitación");
        if (!"PENDING".equals(status)) {
            if ("ACCEPTED".equals(status) && actorId.equals(acceptedBy)) return;
            throw new IllegalStateException("La invitación ya no está disponible");
        }
        if (!now.isBefore(expiresAt)) {
            status = "EXPIRED";
            updatedAt = now;
            throw new IllegalStateException("La invitación venció");
        }
        if (!email.equals(normalizeEmail(authenticatedEmail)))
            throw new AccessDeniedException("La invitación pertenece a otro correo");
        status = "ACCEPTED";
        acceptedBy = actorId;
        acceptedAt = now;
        updatedAt = now;
    }

    public void revoke(Instant now) {
        if (!"PENDING".equals(status))
            throw new IllegalStateException("Solo se puede revocar una invitación pendiente");
        status = "REVOKED";
        revokedAt = now;
        updatedAt = now;
    }

    private static String normalizeEmail(String value) {
        if (value == null || value.isBlank())
            throw new IllegalArgumentException("El correo invitado es obligatorio");
        var clean = value.trim().toLowerCase(Locale.ROOT);
        if (clean.length() > 320 || !clean.contains("@"))
            throw new IllegalArgumentException("El correo invitado no es válido");
        return clean;
    }

    public UUID id() {
        return id;
    }

    public UUID matchId() {
        return matchId;
    }

    public String email() {
        return email;
    }

    public String status() {
        return status;
    }

    public Instant expiresAt() {
        return expiresAt;
    }

    public UUID acceptedBy() {
        return acceptedBy;
    }

    public Instant acceptedAt() {
        return acceptedAt;
    }
}
