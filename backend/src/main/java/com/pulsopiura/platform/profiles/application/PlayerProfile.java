package com.pulsopiura.platform.profiles.application;

import java.util.UUID;

public record PlayerProfile(
        UUID userId,
        String homeDistrictCode,
        String bio,
        String preferredDisplayName,
        String avatarUrl,
        String visibility,
        String onboardingStatus) {}
