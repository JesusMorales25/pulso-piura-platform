package com.pulsopiura.platform.matches.application;

import java.util.UUID;

public record MatchAuditEvent(UUID actorId, UUID organizationId, UUID matchId, String action) {}
