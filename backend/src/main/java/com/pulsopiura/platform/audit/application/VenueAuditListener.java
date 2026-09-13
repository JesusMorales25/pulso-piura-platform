package com.pulsopiura.platform.audit.application;

import com.pulsopiura.platform.audit.infrastructure.persistence.*;
import com.pulsopiura.platform.venues.application.VenueAuditEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class VenueAuditListener {
    private final AuditEventRepository events;

    public VenueAuditListener(AuditEventRepository events) {
        this.events = events;
    }

    @EventListener
    @Transactional
    public void record(VenueAuditEvent event) {
        events.save(
                AuditEventEntity.resourceAction(
                        event.actorId(),
                        event.organizationId(),
                        event.action(),
                        event.resourceType(),
                        event.resourceId()));
    }
}
