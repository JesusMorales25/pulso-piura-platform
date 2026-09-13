package com.pulsopiura.platform.reservations.api;

import com.pulsopiura.platform.identity.application.CurrentUserService;
import com.pulsopiura.platform.reservations.application.ReservationQueryService;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/organizations/{organizationId}/reservations")
public class OrganizationReservationController {
    private final CurrentUserService users;
    private final ReservationQueryService reservations;
    private final com.pulsopiura.platform.reservations.application.ReservationTransitionService
            transitions;

    public OrganizationReservationController(
            CurrentUserService users,
            ReservationQueryService reservations,
            com.pulsopiura.platform.reservations.application.ReservationTransitionService
                    transitions) {
        this.users = users;
        this.reservations = reservations;
        this.transitions = transitions;
    }

    @PostMapping("/{reservationId}/cancel")
    com.pulsopiura.platform.reservations.application.ReservationView cancel(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId,
            @PathVariable UUID reservationId,
            @RequestHeader(value = "X-Correlation-Id", required = false) String correlationId) {
        return transitions.cancelForOwner(
                users.provision(jwt).id(), organizationId, reservationId, correlationId);
    }

    @GetMapping("/summary")
    com.pulsopiura.platform.reservations.application.port.ReservationDetailsQuery.Summary summary(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID organizationId) {
        return reservations.summary(users.provision(jwt).id(), organizationId);
    }

    @GetMapping
    ReservationQueryService.OrganizationReservationPage list(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return reservations.listForOrganization(
                users.provision(jwt).id(), organizationId, page, size);
    }
}
