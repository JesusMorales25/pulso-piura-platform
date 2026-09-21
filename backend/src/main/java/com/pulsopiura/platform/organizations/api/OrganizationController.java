package com.pulsopiura.platform.organizations.api;

import com.pulsopiura.platform.foundation.security.OidcRoleClaims;
import com.pulsopiura.platform.identity.application.CurrentUserService;
import com.pulsopiura.platform.organizations.application.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/organizations")
public class OrganizationController {
    private final CurrentUserService users;
    private final OrganizationService organizations;
    private final MembershipService memberships;
    private final VenueOwnerAuthorization venueOwnerAuthorization;
    private final OidcRoleClaims roleClaims;

    public OrganizationController(
            CurrentUserService users,
            OrganizationService organizations,
            MembershipService memberships,
            VenueOwnerAuthorization venueOwnerAuthorization,
            OidcRoleClaims roleClaims) {
        this.users = users;
        this.organizations = organizations;
        this.memberships = memberships;
        this.venueOwnerAuthorization = venueOwnerAuthorization;
        this.roleClaims = roleClaims;
    }

    @PostMapping
    ResponseEntity<OrganizationView> create(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateOrganizationRequest request) {
        var actor = users.provision(jwt).id();
        venueOwnerAuthorization.requireCanCreateOrganization(actor, roleClaims.roles(jwt));
        var result = organizations.create(actor, request.name());
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @GetMapping
    List<OrganizationView> list(@AuthenticationPrincipal Jwt jwt) {
        return organizations.listFor(users.provision(jwt).id());
    }

    @GetMapping("/{organizationId}")
    OrganizationView get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID organizationId) {
        return organizations.get(users.provision(jwt).id(), organizationId);
    }

    @PostMapping("/{organizationId}/invitations")
    ResponseEntity<InvitationView> invite(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId,
            @Valid @RequestBody InviteMemberRequest request) {
        var invitation =
                memberships.invite(
                        users.provision(jwt).id(), organizationId, request.email(), request.role());
        return ResponseEntity.status(HttpStatus.CREATED).body(invitation);
    }

    @PostMapping("/invitations/{invitationId}/accept")
    MemberView accept(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID invitationId) {
        var user = users.provision(jwt);
        return memberships.accept(user.id(), user.email(), invitationId);
    }

    @GetMapping("/{organizationId}/members")
    List<MemberView> members(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID organizationId) {
        return memberships.list(users.provision(jwt).id(), organizationId);
    }

    @DeleteMapping("/{organizationId}/members/{userId}")
    ResponseEntity<Void> revoke(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId,
            @PathVariable UUID userId) {
        memberships.revoke(users.provision(jwt).id(), organizationId, userId);
        return ResponseEntity.noContent().build();
    }

    public record CreateOrganizationRequest(@NotBlank @Size(max = 160) String name) {}

    public record InviteMemberRequest(
            @NotBlank @jakarta.validation.constraints.Email String email, @NotBlank String role) {}
}
