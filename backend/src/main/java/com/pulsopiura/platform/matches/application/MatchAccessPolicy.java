package com.pulsopiura.platform.matches.application;

import com.pulsopiura.platform.matches.domain.MatchVisibility;
import com.pulsopiura.platform.matches.domain.SportsMatch;
import com.pulsopiura.platform.matches.infrastructure.persistence.MatchInvitationRepository;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

@Component
public class MatchAccessPolicy {
    private final MatchInvitationRepository invitations;

    public MatchAccessPolicy(MatchInvitationRepository invitations) {
        this.invitations = invitations;
    }

    public void requireCanAccess(SportsMatch match, UUID actorId) {
        if (match.visibility() != MatchVisibility.PRIVATE) return;
        if (actorId != null && match.organizerUserId().equals(actorId)) return;
        if (actorId != null
                && invitations.existsByMatchIdAndAcceptedByAndStatus(
                        match.id(), actorId, "ACCEPTED")) return;
        throw new AccessDeniedException(
                "Esta pichanga es privada y requiere una invitación aceptada");
    }
}
