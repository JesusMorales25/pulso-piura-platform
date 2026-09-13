package com.pulsopiura.platform.organizations.application;

import java.util.UUID;

public record MemberView(UUID organizationId, UUID userId, String role) {}
