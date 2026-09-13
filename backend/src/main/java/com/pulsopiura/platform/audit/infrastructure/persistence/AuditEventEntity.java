package com.pulsopiura.platform.audit.infrastructure.persistence;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "audit_events", schema = "app")
public class AuditEventEntity {
    @Id private UUID id;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    @Column(name = "actor_user_id")
    private UUID actorUserId;

    @Column(name = "organization_id")
    private UUID organizationId;

    @Column(nullable = false, length = 80)
    private String action;

    @Column(name = "resource_type", nullable = false, length = 80)
    private String resourceType;

    @Column(name = "resource_id")
    private UUID resourceId;

    @Column(nullable = false, length = 30)
    private String result;

    protected AuditEventEntity() {}

    public static AuditEventEntity firstAccess(UUID userId) {
        var e = new AuditEventEntity();
        e.id = UUID.randomUUID();
        e.occurredAt = Instant.now();
        e.actorUserId = userId;
        e.action = "IDENTITY_FIRST_ACCESS";
        e.resourceType = "USER";
        e.resourceId = userId;
        e.result = "SUCCESS";
        return e;
    }

    public static AuditEventEntity organizationAction(
            UUID actorId, UUID organizationId, String action) {
        var event = new AuditEventEntity();
        event.id = UUID.randomUUID();
        event.occurredAt = Instant.now();
        event.actorUserId = actorId;
        event.organizationId = organizationId;
        event.action = action;
        event.resourceType = "ORGANIZATION";
        event.resourceId = organizationId;
        event.result = "SUCCESS";
        return event;
    }

    public static AuditEventEntity resourceAction(
            UUID actorId,
            UUID organizationId,
            String action,
            String resourceType,
            UUID resourceId) {
        var event = new AuditEventEntity();
        event.id = UUID.randomUUID();
        event.occurredAt = Instant.now();
        event.actorUserId = actorId;
        event.organizationId = organizationId;
        event.action = action;
        event.resourceType = resourceType;
        event.resourceId = resourceId;
        event.result = "SUCCESS";
        return event;
    }

    public static AuditEventEntity capabilityRequestAction(
            UUID actorId, String action, UUID requestId) {
        var event = new AuditEventEntity();
        event.id = UUID.randomUUID();
        event.occurredAt = Instant.now();
        event.actorUserId = actorId;
        event.action = action;
        event.resourceType = "CAPABILITY_REQUEST";
        event.resourceId = requestId;
        event.result = "SUCCESS";
        return event;
    }
}
