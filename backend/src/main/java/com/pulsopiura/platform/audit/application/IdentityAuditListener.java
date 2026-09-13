package com.pulsopiura.platform.audit.application;

import com.pulsopiura.platform.audit.infrastructure.persistence.*;
import com.pulsopiura.platform.identity.application.UserProvisioned;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class IdentityAuditListener {
    private final AuditEventRepository events;

    public IdentityAuditListener(AuditEventRepository events) {
        this.events = events;
    }

    @EventListener
    @Transactional
    public void firstAccess(UserProvisioned event) {
        events.save(AuditEventEntity.firstAccess(event.userId()));
    }
}
