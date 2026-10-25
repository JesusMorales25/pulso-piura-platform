package com.pulsopiura.platform.media.application;

import java.util.UUID;

public record VisualAssetAuditEvent(UUID actorId, String action, UUID resourceId) {}
