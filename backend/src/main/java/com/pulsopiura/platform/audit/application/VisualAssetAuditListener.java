package com.pulsopiura.platform.audit.application;

import com.pulsopiura.platform.audit.infrastructure.persistence.*;
import com.pulsopiura.platform.media.application.VisualAssetAuditEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class VisualAssetAuditListener {
    private final AuditEventRepository events;

    public VisualAssetAuditListener(AuditEventRepository events) {
        this.events = events;
    }

    @EventListener
    @Transactional
    public void record(VisualAssetAuditEvent event) {
        events.save(
                AuditEventEntity.resourceAction(
                        event.actorId(),
                        null,
                        event.action(),
                        "PLATFORM_VISUAL_ASSET",
                        event.resourceId()));
    }
}
