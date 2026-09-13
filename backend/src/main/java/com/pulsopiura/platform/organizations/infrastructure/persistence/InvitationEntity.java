package com.pulsopiura.platform.organizations.infrastructure.persistence;

import com.pulsopiura.platform.organizations.domain.OrganizationRole;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "organization_invitations", schema = "app")
public class InvitationEntity {
    @Id private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(nullable = false, length = 320)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private OrganizationRole role;

    @Column(nullable = false, length = 30)
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

    @Version private long version;

    protected InvitationEntity() {}

    public static InvitationEntity create(
            UUID organizationId, String email, OrganizationRole role, UUID invitedBy, Instant now) {
        if (role == OrganizationRole.OWNER)
            throw new IllegalArgumentException("OWNER no se asigna por invitación");
        var invitation = new InvitationEntity();
        invitation.id = UUID.randomUUID();
        invitation.organizationId = organizationId;
        invitation.email = email;
        invitation.role = role;
        invitation.status = "PENDING";
        invitation.invitedBy = invitedBy;
        invitation.invitedAt = now;
        invitation.expiresAt = now.plusSeconds(7 * 24 * 60 * 60);
        return invitation;
    }

    public void accept(UUID userId, String authenticatedEmail, Instant now) {
        if (!"PENDING".equals(status))
            throw new IllegalArgumentException("La invitación ya no está pendiente");
        if (now.isAfter(expiresAt)) {
            status = "EXPIRED";
            throw new IllegalArgumentException("La invitación venció");
        }
        if (authenticatedEmail == null || !email.equalsIgnoreCase(authenticatedEmail.trim()))
            throw new org.springframework.security.access.AccessDeniedException(
                    "La invitación pertenece a otro correo");
        status = "ACCEPTED";
        acceptedBy = userId;
        acceptedAt = now;
    }

    public UUID id() {
        return id;
    }

    public UUID organizationId() {
        return organizationId;
    }

    public String email() {
        return email;
    }

    public OrganizationRole role() {
        return role;
    }

    public String status() {
        return status;
    }

    public Instant expiresAt() {
        return expiresAt;
    }
}
