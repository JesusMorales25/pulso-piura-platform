package com.pulsopiura.platform.identity.application;

import com.pulsopiura.platform.foundation.security.OidcUserClaims;
import com.pulsopiura.platform.identity.domain.UserStatus;
import com.pulsopiura.platform.identity.infrastructure.persistence.UserEntity;
import com.pulsopiura.platform.identity.infrastructure.persistence.UserRepository;
import java.time.Clock;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CurrentUserService {
    private final UserRepository users;
    private final ApplicationEventPublisher events;
    private final Clock clock;
    private final OidcUserClaims claims;

    @Autowired
    public CurrentUserService(
            UserRepository users, ApplicationEventPublisher events, OidcUserClaims claims) {
        this(users, events, claims, Clock.systemUTC());
    }

    CurrentUserService(
            UserRepository users,
            ApplicationEventPublisher events,
            OidcUserClaims claims,
            Clock clock) {
        this.users = users;
        this.events = events;
        this.claims = claims;
        this.clock = clock;
    }

    @Transactional
    public CurrentUser provision(Jwt jwt) {
        if (jwt.getSubject() == null || jwt.getSubject().isBlank())
            throw new AccessDeniedException("Token sin sujeto");
        var existing = users.findByIdentitySubject(jwt.getSubject());
        UserEntity user;
        boolean created = false;
        if (existing.isPresent()) user = existing.get();
        else {
            user =
                    UserEntity.create(
                            jwt.getSubject(),
                            claims.email(jwt),
                            claims.emailVerified(jwt),
                            claims.name(jwt),
                            clock.instant());
            try {
                user = users.saveAndFlush(user);
                created = true;
            } catch (DataIntegrityViolationException race) {
                user = users.findByIdentitySubject(jwt.getSubject()).orElseThrow(() -> race);
            }
        }
        if (user.status() != UserStatus.ACTIVE) throw new AccessDeniedException("Cuenta no activa");
        user.refreshClaims(
                claims.email(jwt),
                claims.emailVerified(jwt),
                claims.name(jwt),
                claims.picture(jwt),
                clock.instant());
        if (created) events.publishEvent(new UserProvisioned(user.id()));
        return new CurrentUser(
                user.id(),
                user.subject(),
                user.email(),
                user.emailVerified(),
                user.displayName(),
                user.avatarUrl(),
                user.status());
    }
}
