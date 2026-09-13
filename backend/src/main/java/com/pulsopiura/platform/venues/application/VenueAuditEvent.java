package com.pulsopiura.platform.venues.application;

import java.util.UUID;

public record VenueAuditEvent(
        UUID actorId, UUID organizationId, String action, String resourceType, UUID resourceId) {}
