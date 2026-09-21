package com.pulsopiura.platform.matches.application;

import com.pulsopiura.platform.matches.domain.MatchVisibility;
import com.pulsopiura.platform.matches.domain.SportsMatch;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

@Component
public class MatchAccessPolicy {
    public void requireCanAccess(SportsMatch match, UUID actorId) {
        if (match.visibility() != MatchVisibility.PRIVATE) return;
        if (actorId != null) return;
        throw new AccessDeniedException("Inicia sesión para abrir esta pichanga privada");
    }
}
