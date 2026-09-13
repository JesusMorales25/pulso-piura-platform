package com.pulsopiura.platform.identity.application;

import com.pulsopiura.platform.identity.domain.UserStatus;
import java.util.UUID;

public record CurrentUser(
        UUID id,
        String subject,
        String email,
        boolean emailVerified,
        String displayName,
        String avatarUrl,
        UserStatus status) {}
