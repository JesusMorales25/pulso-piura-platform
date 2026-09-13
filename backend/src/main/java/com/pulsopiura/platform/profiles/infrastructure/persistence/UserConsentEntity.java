package com.pulsopiura.platform.profiles.infrastructure.persistence;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "user_consents", schema = "app")
public class UserConsentEntity {
    @Id private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "terms_version", nullable = false, length = 30)
    private String termsVersion;

    @Column(name = "privacy_version", nullable = false, length = 30)
    private String privacyVersion;

    @Column(name = "accepted_at", nullable = false)
    private Instant acceptedAt;

    protected UserConsentEntity() {}

    public static UserConsentEntity create(UUID userId, String terms, String privacy, Instant now) {
        var c = new UserConsentEntity();
        c.id = UUID.randomUUID();
        c.userId = userId;
        c.termsVersion = terms;
        c.privacyVersion = privacy;
        c.acceptedAt = now;
        return c;
    }
}
