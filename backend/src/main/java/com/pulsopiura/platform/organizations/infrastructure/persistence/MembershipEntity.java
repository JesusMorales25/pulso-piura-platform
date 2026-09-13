package com.pulsopiura.platform.organizations.infrastructure.persistence;

import com.pulsopiura.platform.organizations.domain.OrganizationRole;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "organization_memberships", schema = "app")
public class MembershipEntity {
    @Id private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private OrganizationRole role;

    @Column(nullable = false, length = 30)
    private String status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Version private long version;

    protected MembershipEntity() {}

    public static MembershipEntity owner(UUID organizationId, UUID userId, Instant now) {
        return create(organizationId, userId, OrganizationRole.OWNER, now);
    }

    public static MembershipEntity create(
            UUID organizationId, UUID userId, OrganizationRole role, Instant now) {
        var membership = new MembershipEntity();
        membership.id = UUID.randomUUID();
        membership.organizationId = organizationId;
        membership.userId = userId;
        membership.role = role;
        membership.status = "ACTIVE";
        membership.createdAt = now;
        return membership;
    }

    public UUID organizationId() {
        return organizationId;
    }

    public UUID userId() {
        return userId;
    }

    public OrganizationRole role() {
        return role;
    }

    public void revoke(Instant now) {
        if (role == OrganizationRole.OWNER)
            throw new IllegalArgumentException("No se puede revocar al propietario");
        status = "REVOKED";
        revokedAt = now;
    }

    public void reactivate(OrganizationRole newRole) {
        if ("ACTIVE".equals(status))
            throw new IllegalArgumentException("El usuario ya es miembro activo");
        if (newRole == OrganizationRole.OWNER)
            throw new IllegalArgumentException("OWNER no se asigna por invitación");
        role = newRole;
        status = "ACTIVE";
        revokedAt = null;
    }
}
