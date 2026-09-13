package com.pulsopiura.platform.audit.application;

import com.pulsopiura.platform.audit.infrastructure.persistence.*;
import com.pulsopiura.platform.matches.application.MatchAuditEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class MatchAuditListener {
    private final AuditEventRepository events;

    public MatchAuditListener(AuditEventRepository events) {
        this.events = events;
    }

    @EventListener
    @Transactional
    public void record(MatchAuditEvent event) {
        events.save(
                AuditEventEntity.resourceAction(
                        event.actorId(),
                        event.organizationId(),
                        event.action(),
                        "MATCH",
                        event.matchId()));
    }
}
