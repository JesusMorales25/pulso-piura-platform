package com.pulsopiura.platform.profiles.infrastructure.persistence;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "player_profiles", schema = "app")
public class PlayerProfileEntity {
    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "home_district_code", length = 30)
    private String homeDistrictCode;

    @Column(length = 500)
    private String bio;

    @Column(name = "preferred_display_name", length = 120)
    private String preferredDisplayName;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Column(nullable = false, length = 30)
    private String visibility;

    @Column(name = "onboarding_status", nullable = false, length = 30)
    private String onboardingStatus;

    protected PlayerProfileEntity() {}

    public static PlayerProfileEntity pending(UUID userId) {
        var p = new PlayerProfileEntity();
        p.userId = userId;
        p.visibility = "PARTICIPANTS";
        p.onboardingStatus = "PENDING";
        return p;
    }

    public void update(
            String district,
            String bio,
            String visibility,
            String preferredDisplayName,
            String avatarUrl,
            boolean consentComplete) {
        this.homeDistrictCode = blankToNull(district);
        this.bio = blankToNull(bio);
        if (visibility != null) this.visibility = visibility;
        this.preferredDisplayName = blankToNull(preferredDisplayName);
        this.avatarUrl = blankToNull(avatarUrl);
        this.onboardingStatus =
                this.homeDistrictCode != null && consentComplete ? "COMPLETE" : "PENDING";
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public UUID userId() {
        return userId;
    }

    public String homeDistrictCode() {
        return homeDistrictCode;
    }

    public String bio() {
        return bio;
    }

    public String visibility() {
        return visibility;
    }

    public String onboardingStatus() {
        return onboardingStatus;
    }

    public String preferredDisplayName() {
        return preferredDisplayName;
    }

    public String avatarUrl() {
        return avatarUrl;
    }
}
