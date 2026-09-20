package com.pulsopiura.platform.identity.api;

import com.pulsopiura.platform.identity.application.CapabilityRequestService;
import com.pulsopiura.platform.identity.application.CurrentUserService;
import com.pulsopiura.platform.identity.domain.CapabilityType;
import com.pulsopiura.platform.profiles.application.PlayerProfileService;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/me")
public class MeController {
    private final CurrentUserService users;
    private final PlayerProfileService profiles;
    private final CapabilityRequestService capabilityRequests;

    public MeController(
            CurrentUserService users,
            PlayerProfileService profiles,
            CapabilityRequestService capabilityRequests) {
        this.users = users;
        this.profiles = profiles;
        this.capabilityRequests = capabilityRequests;
    }

    @GetMapping
    MeResponse me(@AuthenticationPrincipal Jwt jwt) {
        var user = users.provision(jwt);
        var profile = profiles.get(user.id());
        return new MeResponse(
                user.id(),
                user.email(),
                user.emailVerified(),
                user.displayName(),
                user.avatarUrl(),
                user.status().name(),
                profile.onboardingStatus());
    }

    @GetMapping("/profile")
    Object profile(@AuthenticationPrincipal Jwt jwt) {
        return profiles.get(users.provision(jwt).id());
    }

    @PatchMapping("/profile")
    Object update(@AuthenticationPrincipal Jwt jwt, @RequestBody UpdateProfileRequest request) {
        var user = users.provision(jwt);
        return profiles.update(
                user.id(),
                request.homeDistrictCode(),
                request.bio(),
                request.visibility(),
                request.preferredDisplayName(),
                user.avatarUrl(),
                request.termsVersion(),
                request.privacyVersion());
    }

    @GetMapping("/capability-requests")
    List<CapabilityRequestService.CapabilityRequestView> capabilityRequests(
            @AuthenticationPrincipal Jwt jwt) {
        return capabilityRequests.listFor(users.provision(jwt).id());
    }

    @PostMapping("/capability-requests")
    CapabilityRequestService.CapabilityRequestView requestCapability(
            @AuthenticationPrincipal Jwt jwt, @RequestBody CapabilityRequestRequest request) {
        if (request.capability() == null || request.capability().isBlank())
            throw new IllegalArgumentException("El perfil solicitado es obligatorio");
        var capability =
                switch (request.capability()) {
                    case "MATCH_ORGANIZER" -> CapabilityType.MATCH_ORGANIZER;
                    case "VENUE_OWNER" -> CapabilityType.VENUE_OWNER;
                    default -> throw new IllegalArgumentException("Perfil no disponible");
                };
        var user = users.provision(jwt);
        return capabilityRequests.request(
                user.id(), capability, request.reason(), user.emailVerified());
    }

    record MeResponse(
            UUID id,
            String email,
            boolean emailVerified,
            String displayName,
            String avatarUrl,
            String status,
            String onboardingStatus) {}

    public record UpdateProfileRequest(
            String homeDistrictCode,
            String bio,
            String visibility,
            String preferredDisplayName,
            String termsVersion,
            String privacyVersion) {}

    public record CapabilityRequestRequest(String capability, String reason) {}
}
