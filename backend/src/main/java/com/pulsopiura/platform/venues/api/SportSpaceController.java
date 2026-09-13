package com.pulsopiura.platform.venues.api;

import com.pulsopiura.platform.identity.application.CurrentUserService;
import com.pulsopiura.platform.venues.application.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/organizations/{organizationId}/spaces")
public class SportSpaceController {
    private final CurrentUserService users;
    private final VenueService venues;

    public SportSpaceController(CurrentUserService users, VenueService venues) {
        this.users = users;
        this.venues = venues;
    }

    @PutMapping("/{spaceId}")
    SportSpaceView update(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId,
            @PathVariable UUID spaceId,
            @Valid @RequestBody UpdateSportSpaceRequest request) {
        return venues.updateSpace(
                users.provision(jwt).id(),
                organizationId,
                spaceId,
                request.name(),
                request.sportCode(),
                request.formatCode(),
                request.capacity(),
                request.surfaceType(),
                request.indoor(),
                request.amenityCodes(),
                request.version());
    }

    @PostMapping("/{spaceId}/publish")
    SportSpaceView publish(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId,
            @PathVariable UUID spaceId) {
        return venues.publishSpace(users.provision(jwt).id(), organizationId, spaceId);
    }

    @DeleteMapping("/{spaceId}")
    ResponseEntity<Void> archive(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId,
            @PathVariable UUID spaceId) {
        venues.archiveSpace(users.provision(jwt).id(), organizationId, spaceId);
        return ResponseEntity.noContent().build();
    }

    public record UpdateSportSpaceRequest(
            @NotBlank @Size(max = 160) String name,
            @NotBlank String sportCode,
            @NotBlank @Size(max = 40) String formatCode,
            @Min(1) int capacity,
            @Size(max = 40) String surfaceType,
            boolean indoor,
            Set<@NotBlank @Size(max = 40) String> amenityCodes,
            @PositiveOrZero long version) {}
}
