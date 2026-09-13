package com.pulsopiura.platform.identity.api;

import com.pulsopiura.platform.identity.application.CapabilityRequestService;
import com.pulsopiura.platform.identity.application.CurrentUserService;
import com.pulsopiura.platform.identity.application.PlatformAdminQueryService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/platform")
@PreAuthorize("hasRole('PLATFORM_ADMIN')")
public class PlatformAdminController {
    private final CurrentUserService users;
    private final CapabilityRequestService capabilityRequests;
    private final PlatformAdminQueryService platformQueries;

    public PlatformAdminController(
            CurrentUserService users,
            CapabilityRequestService capabilityRequests,
            PlatformAdminQueryService platformQueries) {
        this.users = users;
        this.capabilityRequests = capabilityRequests;
        this.platformQueries = platformQueries;
    }

    @GetMapping("/summary")
    PlatformAdminQueryService.SummaryView summary() {
        return platformQueries.summary();
    }

    @GetMapping("/users")
    List<PlatformAdminQueryService.UserView> users() {
        return platformQueries.users();
    }

    @GetMapping("/capability-requests")
    List<PlatformAdminQueryService.RequestView> capabilityRequests() {
        return platformQueries.requests();
    }

    @PostMapping("/capability-requests/{requestId}/review")
    PlatformAdminQueryService.RequestView review(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID requestId,
            @Valid @RequestBody ReviewRequest request) {
        capabilityRequests.review(
                requestId, users.provision(jwt).id(), request.decision(), request.note());
        return platformQueries.request(requestId);
    }

    @PostMapping("/capability-requests/{requestId}/revoke")
    PlatformAdminQueryService.RequestView revoke(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID requestId,
            @RequestBody(required = false) RevokeRequest request) {
        capabilityRequests.revoke(
                requestId, users.provision(jwt).id(), request == null ? null : request.note());
        return platformQueries.request(requestId);
    }

    public record ReviewRequest(@NotBlank String decision, String note) {}

    public record RevokeRequest(String note) {}
}
