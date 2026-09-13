package com.pulsopiura.platform.organizations.application;

import java.time.Instant;
import java.util.UUID;

public record InvitationView(
        UUID id,
        UUID organizationId,
        String email,
        String role,
        String status,
        Instant expiresAt) {}
