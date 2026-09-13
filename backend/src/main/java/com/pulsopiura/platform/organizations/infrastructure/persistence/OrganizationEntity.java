package com.pulsopiura.platform.organizations.infrastructure.persistence;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "organizations", schema = "app")
public class OrganizationEntity {
    @Id private UUID id;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(nullable = false, unique = true, length = 100)
    private String slug;

    @Column(nullable = false, length = 30)
    private String status;

    @Column(nullable = false, length = 63)
    private String timezone;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version private long version;

    protected OrganizationEntity() {}

    public static OrganizationEntity create(String name, String slug, UUID actorId, Instant now) {
        var organization = new OrganizationEntity();
        organization.id = UUID.randomUUID();
        organization.name = name;
        organization.slug = slug;
        organization.status = "ACTIVE";
        organization.timezone = "America/Lima";
        organization.createdBy = actorId;
        organization.createdAt = now;
        organization.updatedAt = now;
        return organization;
    }

    public UUID id() {
        return id;
    }

    public String name() {
        return name;
    }

    public String slug() {
        return slug;
    }

    public String status() {
        return status;
    }

    public String timezone() {
        return timezone;
    }
}
