package com.pulsopiura.platform.audit.application;

import com.pulsopiura.platform.audit.infrastructure.persistence.*;
import com.pulsopiura.platform.organizations.application.OrganizationAuditEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class OrganizationAuditListener {
    private final AuditEventRepository events;

    public OrganizationAuditListener(AuditEventRepository events) {
        this.events = events;
    }

    @EventListener
    @Transactional
    public void record(OrganizationAuditEvent event) {
        events.save(
                AuditEventEntity.organizationAction(
                        event.actorId(), event.organizationId(), event.action()));
    }
}
