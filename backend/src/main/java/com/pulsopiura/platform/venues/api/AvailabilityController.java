package com.pulsopiura.platform.venues.api;

import com.pulsopiura.platform.identity.application.CurrentUserService;
import com.pulsopiura.platform.venues.application.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.*;
import java.util.*;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/organizations/{organizationId}/spaces/{spaceId}")
public class AvailabilityController {
    private final CurrentUserService users;
    private final AvailabilityService availability;

    public AvailabilityController(CurrentUserService users, AvailabilityService availability) {
        this.users = users;
        this.availability = availability;
    }

    @PostMapping("/availability-rules")
    ResponseEntity<AvailabilityRuleView> createRule(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId,
            @PathVariable UUID spaceId,
            @Valid @RequestBody CreateAvailabilityRuleRequest request) {
        var rule =
                availability.createRule(
                        users.provision(jwt).id(),
                        organizationId,
                        spaceId,
                        request.dayOfWeek(),
                        request.startLocalTime(),
                        request.endLocalTime(),
                        request.slotMinutes(),
                        request.priceMinor(),
                        request.validFrom(),
                        request.validTo());
        return ResponseEntity.status(HttpStatus.CREATED).body(rule);
    }

    @GetMapping("/availability-rules")
    List<AvailabilityRuleView> listRules(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId,
            @PathVariable UUID spaceId) {
        return availability.listRules(users.provision(jwt).id(), organizationId, spaceId);
    }

    @DeleteMapping("/availability-rules/{ruleId}")
    ResponseEntity<Void> deactivateRule(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId,
            @PathVariable UUID spaceId,
            @PathVariable UUID ruleId,
            @RequestParam @PositiveOrZero long version) {
        availability.deactivateRule(
                users.provision(jwt).id(), organizationId, spaceId, ruleId, version);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/exceptions")
    ResponseEntity<AvailabilityExceptionView> createException(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId,
            @PathVariable UUID spaceId,
            @Valid @RequestBody CreateAvailabilityExceptionRequest request) {
        var exception =
                availability.createException(
                        users.provision(jwt).id(),
                        organizationId,
                        spaceId,
                        request.startsAt(),
                        request.endsAt(),
                        request.type(),
                        request.priceMinor(),
                        request.reason());
        return ResponseEntity.status(HttpStatus.CREATED).body(exception);
    }

    @GetMapping("/exceptions")
    List<AvailabilityExceptionView> listExceptions(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId,
            @PathVariable UUID spaceId) {
        return availability.listExceptions(users.provision(jwt).id(), organizationId, spaceId);
    }

    @DeleteMapping("/exceptions/{exceptionId}")
    ResponseEntity<Void> cancelException(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId,
            @PathVariable UUID spaceId,
            @PathVariable UUID exceptionId,
            @RequestParam @PositiveOrZero long version) {
        availability.cancelException(
                users.provision(jwt).id(), organizationId, spaceId, exceptionId, version);
        return ResponseEntity.noContent().build();
    }

    public record CreateAvailabilityRuleRequest(
            @Min(1) @Max(7) int dayOfWeek,
            @NotNull LocalTime startLocalTime,
            @NotNull LocalTime endLocalTime,
            @Min(30) @Max(180) int slotMinutes,
            @PositiveOrZero long priceMinor,
            @NotNull LocalDate validFrom,
            LocalDate validTo) {}

    public record CreateAvailabilityExceptionRequest(
            @NotNull Instant startsAt,
            @NotNull Instant endsAt,
            @NotBlank String type,
            @PositiveOrZero Long priceMinor,
            @Size(max = 240) String reason) {}
}
