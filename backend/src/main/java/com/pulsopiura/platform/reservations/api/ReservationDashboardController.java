package com.pulsopiura.platform.reservations.api;

import com.pulsopiura.platform.identity.application.CurrentUserService;
import com.pulsopiura.platform.reservations.application.*;
import com.pulsopiura.platform.reservations.application.ReservationDashboard.Filter;
import com.pulsopiura.platform.reservations.application.ReservationQueryService.OrganizationReservationView;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
public class ReservationDashboardController {
    private final CurrentUserService users;
    private final ReservationDashboardService dashboards;

    public ReservationDashboardController(
            CurrentUserService users, ReservationDashboardService dashboards) {
        this.users = users;
        this.dashboards = dashboards;
    }

    @GetMapping("/api/v1/me/reservations/dashboard")
    ReservationDashboard<ReservationView> own(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) Filter filter,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return dashboards.own(users.provision(jwt).id(), filter, page, size);
    }

    @GetMapping("/api/v1/organizations/{organizationId}/reservations/dashboard")
    ReservationDashboard<OrganizationReservationView> organization(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId,
            @RequestParam(required = false) Filter filter,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return dashboards.organization(
                users.provision(jwt).id(), organizationId, filter, page, size);
    }
}
