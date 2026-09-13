package com.pulsopiura.platform.organizations.application;

import java.util.UUID;

public record OrganizationAuditEvent(UUID actorId, UUID organizationId, String action) {}
