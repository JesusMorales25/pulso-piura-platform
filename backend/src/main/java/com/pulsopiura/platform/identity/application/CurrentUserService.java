package com.pulsopiura.platform.identity.application;

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

    @Autowired
    public CurrentUserService(UserRepository users, ApplicationEventPublisher events) {
        this(users, events, Clock.systemUTC());
    }

    CurrentUserService(UserRepository users, ApplicationEventPublisher events, Clock clock) {
        this.users = users;
        this.events = events;
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
                            jwt.getClaimAsString("email"),
                            Boolean.TRUE.equals(jwt.getClaim("email_verified")),
                            jwt.getClaimAsString("name"),
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
                jwt.getClaimAsString("email"),
                Boolean.TRUE.equals(jwt.getClaim("email_verified")),
                jwt.getClaimAsString("name"),
                jwt.getClaimAsString("picture"),
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
