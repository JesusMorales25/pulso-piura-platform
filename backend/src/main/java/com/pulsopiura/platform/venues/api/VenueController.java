package com.pulsopiura.platform.venues.api;

import com.pulsopiura.platform.identity.application.CurrentUserService;
import com.pulsopiura.platform.venues.application.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.*;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/organizations/{organizationId}/venues")
public class VenueController {
    private final CurrentUserService users;
    private final VenueService venues;

    public VenueController(CurrentUserService users, VenueService venues) {
        this.users = users;
        this.venues = venues;
    }

    @PostMapping
    ResponseEntity<VenueView> create(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId,
            @Valid @RequestBody CreateVenueRequest request) {
        var venue =
                venues.createVenue(
                        users.provision(jwt).id(),
                        organizationId,
                        request.name(),
                        request.address(),
                        request.districtCode(),
                        request.latitude(),
                        request.longitude(),
                        request.publicPhone(),
                        request.amenityCodes());
        return ResponseEntity.status(HttpStatus.CREATED).body(venue);
    }

    @GetMapping
    List<VenueView> list(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID organizationId) {
        return venues.listVenues(users.provision(jwt).id(), organizationId);
    }

    @PutMapping("/{venueId}")
    VenueView update(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId,
            @PathVariable UUID venueId,
            @Valid @RequestBody UpdateVenueRequest request) {
        return venues.updateVenue(
                users.provision(jwt).id(),
                organizationId,
                venueId,
                request.name(),
                request.address(),
                request.districtCode(),
                request.latitude(),
                request.longitude(),
                request.publicPhone(),
                request.amenityCodes(),
                request.version());
    }

    @PostMapping("/{venueId}/publish")
    VenueView publish(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId,
            @PathVariable UUID venueId) {
        return venues.publish(users.provision(jwt).id(), organizationId, venueId);
    }

    @DeleteMapping("/{venueId}")
    ResponseEntity<Void> archive(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId,
            @PathVariable UUID venueId) {
        venues.archive(users.provision(jwt).id(), organizationId, venueId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{venueId}/spaces")
    ResponseEntity<SportSpaceView> createSpace(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId,
            @PathVariable UUID venueId,
            @Valid @RequestBody CreateSportSpaceRequest request) {
        var space =
                venues.createSpace(
                        users.provision(jwt).id(),
                        organizationId,
                        venueId,
                        request.name(),
                        request.sportCode(),
                        request.formatCode(),
                        request.capacity(),
                        request.surfaceType(),
                        request.indoor(),
                        request.amenityCodes());
        return ResponseEntity.status(HttpStatus.CREATED).body(space);
    }

    @GetMapping("/{venueId}/spaces")
    List<SportSpaceView> listSpaces(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId,
            @PathVariable UUID venueId) {
        return venues.listSpaces(users.provision(jwt).id(), organizationId, venueId);
    }

    public record CreateVenueRequest(
            @NotBlank @Size(max = 160) String name,
            @NotBlank @Size(max = 240) String address,
            @NotBlank @Size(max = 60) String districtCode,
            @DecimalMin("-90") @DecimalMax("90") BigDecimal latitude,
            @DecimalMin("-180") @DecimalMax("180") BigDecimal longitude,
            @Size(max = 30) String publicPhone,
            Set<@NotBlank @Size(max = 40) String> amenityCodes) {}

    public record UpdateVenueRequest(
            @NotBlank @Size(max = 160) String name,
            @NotBlank @Size(max = 240) String address,
            @NotBlank @Size(max = 60) String districtCode,
            @DecimalMin("-90") @DecimalMax("90") BigDecimal latitude,
            @DecimalMin("-180") @DecimalMax("180") BigDecimal longitude,
            @Size(max = 30) String publicPhone,
            Set<@NotBlank @Size(max = 40) String> amenityCodes,
            @PositiveOrZero long version) {}

    public record CreateSportSpaceRequest(
            @NotBlank @Size(max = 160) String name,
            @NotBlank String sportCode,
            @NotBlank @Size(max = 40) String formatCode,
            @Min(1) int capacity,
            @Size(max = 40) String surfaceType,
            boolean indoor,
            Set<@NotBlank @Size(max = 40) String> amenityCodes) {}
}
