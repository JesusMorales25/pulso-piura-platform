package com.pulsopiura.platform.matches.application;

import com.pulsopiura.platform.identity.application.CapabilityRequestService;
import com.pulsopiura.platform.identity.domain.CapabilityType;
import java.util.Collection;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

@Service
public class MatchOrganizerAuthorization {
    private final CapabilityRequestService capabilityRequests;

    public MatchOrganizerAuthorization(CapabilityRequestService capabilityRequests) {
        this.capabilityRequests = capabilityRequests;
    }

    public void requireOrganizer(UUID actor, Collection<String> realmRoles) {
        var hasOrganizerRole =
                realmRoles.stream()
                        .anyMatch(
                                role ->
                                        role.equals("CAPTAIN")
                                                || role.equals("TOURNAMENT_ORGANIZER"));
        if (!hasOrganizerRole
                && !capabilityRequests.isApproved(actor, CapabilityType.MATCH_ORGANIZER)) {
            throw new AccessDeniedException(
                    "Tu solicitud para organizar partidos aún no está aprobada");
        }
    }
}
