package com.pulsopiura.platform.organizations.api;

import com.pulsopiura.platform.identity.application.CurrentUserService;
import com.pulsopiura.platform.organizations.application.PlatformOrganizationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/platform/organizations")
@PreAuthorize("hasRole('PLATFORM_ADMIN')")
public class PlatformOrganizationAdminController {
    private final PlatformOrganizationService organizations;
    private final CurrentUserService users;

    public PlatformOrganizationAdminController(
            PlatformOrganizationService organizations, CurrentUserService users) {
        this.organizations = organizations;
        this.users = users;
    }

    @GetMapping
    List<PlatformOrganizationService.OrganizationAdminView> organizations() {
        return organizations.organizations();
    }

    @PostMapping("/{organizationId}/owners")
    PlatformOrganizationService.OrganizationAdminView addOwner(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId,
            @Valid @RequestBody OwnerRequest request) {
        return organizations.addOwner(users.provision(jwt).id(), organizationId, request.email());
    }

    @DeleteMapping("/{organizationId}/owners/{userId}")
    PlatformOrganizationService.OrganizationAdminView removeOwner(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId,
            @PathVariable UUID userId) {
        return organizations.removeOwner(users.provision(jwt).id(), organizationId, userId);
    }

    public record OwnerRequest(@NotBlank @Email String email) {}
}
