package com.pulsopiura.platform.profiles.application;

import com.pulsopiura.platform.identity.application.UserProvisioned;
import com.pulsopiura.platform.profiles.infrastructure.persistence.*;
import java.time.Clock;
import java.util.Set;
import java.util.UUID;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PlayerProfileService {
    private static final Set<String> VISIBILITIES = Set.of("PRIVATE", "PARTICIPANTS", "PUBLIC");
    private final PlayerProfileRepository profiles;
    private final UserConsentRepository consents;
    private final Clock clock = Clock.systemUTC();

    public PlayerProfileService(PlayerProfileRepository profiles, UserConsentRepository consents) {
        this.profiles = profiles;
        this.consents = consents;
    }

    @EventListener
    @Transactional
    public void onUserProvisioned(UserProvisioned event) {
        profiles.save(PlayerProfileEntity.pending(event.userId()));
    }

    @Transactional(readOnly = true)
    public PlayerProfile get(UUID userId) {
        return map(profiles.findById(userId).orElseThrow());
    }

    @Transactional
    public PlayerProfile update(
            UUID userId,
            String district,
            String bio,
            String visibility,
            String preferredDisplayName,
            String avatarUrl,
            String terms,
            String privacy) {
        var profile = profiles.findById(userId).orElseThrow();
        if (bio != null && bio.length() > 500)
            throw new IllegalArgumentException("La biografía supera 500 caracteres");
        if (visibility != null && !VISIBILITIES.contains(visibility))
            throw new IllegalArgumentException("Visibilidad inválida");
        if (preferredDisplayName != null && preferredDisplayName.trim().length() > 120)
            throw new IllegalArgumentException("El nombre supera 120 caracteres");
        if (avatarUrl != null && !avatarUrl.isBlank()) {
            var cleanAvatar = avatarUrl.trim();
            if (cleanAvatar.length() > 500
                    || (!cleanAvatar.startsWith("https://") && !cleanAvatar.startsWith("/images/")))
                throw new IllegalArgumentException(
                        "La foto debe usar HTTPS o una imagen local permitida");
        }
        boolean supplied =
                terms != null && !terms.isBlank() && privacy != null && !privacy.isBlank();
        if (supplied && !consents.existsByUserId(userId))
            consents.save(
                    UserConsentEntity.create(
                            userId, terms.trim(), privacy.trim(), clock.instant()));
        profile.update(
                district,
                bio,
                visibility,
                preferredDisplayName,
                avatarUrl,
                consents.existsByUserId(userId) || supplied);
        return map(profile);
    }

    private PlayerProfile map(PlayerProfileEntity p) {
        return new PlayerProfile(
                p.userId(),
                p.homeDistrictCode(),
                p.bio(),
                p.preferredDisplayName(),
                p.avatarUrl(),
                p.visibility(),
                p.onboardingStatus());
    }
}
