package com.pulsopiura.platform.identity.infrastructure.persistence;

import com.pulsopiura.platform.identity.domain.UserStatus;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "users", schema = "app")
public class UserEntity {
    @Id private UUID id;

    @Column(name = "identity_subject", nullable = false, unique = true, length = 128)
    private String identitySubject;

    @Column(length = 320)
    private String email;

    @Column(name = "email_verified", nullable = false)
    private boolean emailVerified;

    @Column(name = "display_name", nullable = false, length = 120)
    private String displayName;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private UserStatus status;

    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    @Column(nullable = false)
    private long version;

    protected UserEntity() {}

    public static UserEntity create(
            String subject, String email, boolean emailVerified, String displayName, Instant now) {
        var user = new UserEntity();
        user.id = UUID.randomUUID();
        user.identitySubject = subject;
        user.status = UserStatus.ACTIVE;
        user.createdAt = now;
        user.refreshClaims(email, emailVerified, displayName, null, now);
        return user;
    }

    public void refreshClaims(
            String email, boolean verified, String name, String pictureUrl, Instant now) {
        var normalizedEmail = email == null ? null : email.trim().toLowerCase(Locale.ROOT);
        var normalizedName = normalizeDisplayName(name, normalizedEmail);
        var normalizedAvatar = validAvatar(pictureUrl);
        if (Objects.equals(this.email, normalizedEmail)
                && this.emailVerified == verified
                && Objects.equals(this.displayName, normalizedName)
                && Objects.equals(this.avatarUrl, normalizedAvatar)) return;
        this.email = normalizedEmail;
        this.emailVerified = verified;
        this.displayName = normalizedName;
        this.avatarUrl = normalizedAvatar;
        this.lastLoginAt = now;
        this.updatedAt = now;
    }

    public UUID id() {
        return id;
    }

    public String subject() {
        return identitySubject;
    }

    public String email() {
        return email;
    }

    public boolean emailVerified() {
        return emailVerified;
    }

    public String displayName() {
        return displayName;
    }

    public String avatarUrl() {
        return avatarUrl;
    }

    public UserStatus status() {
        return status;
    }

    public void suspend() {
        this.status = UserStatus.SUSPENDED;
        this.updatedAt = Instant.now();
    }

    private static String validAvatar(String value) {
        if (value == null || value.isBlank()) return null;
        var clean = value.trim();
        return clean.length() <= 500 && clean.startsWith("https://") ? clean : null;
    }

    private static String normalizeDisplayName(String name, String email) {
        if (name != null && !name.isBlank()) return name.trim();
        if (email == null || email.isBlank()) return "Jugador";
        var localPart =
                email.substring(0, email.indexOf('@') > 0 ? email.indexOf('@') : email.length());
        var words =
                localPart
                        .replace('.', ' ')
                        .replace('_', ' ')
                        .replace('-', ' ')
                        .trim()
                        .split("\\s+");
        var result = new StringBuilder();
        for (var word : words) {
            if (word.isBlank()) continue;
            if (!result.isEmpty()) result.append(' ');
            result.append(Character.toUpperCase(word.charAt(0))).append(word.substring(1));
        }
        return result.isEmpty() ? "Jugador" : result.toString();
    }
}
