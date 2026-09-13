package com.pulsopiura.platform.organizations.application;

import com.pulsopiura.platform.identity.application.CapabilityRequestService;
import com.pulsopiura.platform.identity.domain.CapabilityType;
import java.util.Collection;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

@Service
public class VenueOwnerAuthorization {
    private final CapabilityRequestService capabilityRequests;

    public VenueOwnerAuthorization(CapabilityRequestService capabilityRequests) {
        this.capabilityRequests = capabilityRequests;
    }

    public void requireCanCreateOrganization(UUID actor, Collection<String> realmRoles) {
        if (realmRoles.contains("PLATFORM_ADMIN")) return;
        if (!capabilityRequests.isApproved(actor, CapabilityType.VENUE_OWNER)) {
            throw new AccessDeniedException(
                    "Tu solicitud como dueño de cancha aún no está aprobada");
        }
    }
}
