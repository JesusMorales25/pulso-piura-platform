package com.pulsopiura.platform.organizations.api;

import com.pulsopiura.platform.identity.application.CurrentUserService;
import com.pulsopiura.platform.organizations.application.OrganizationOperationsQuery;
import com.pulsopiura.platform.reservations.application.OrganizationScheduleQuery;
import java.time.LocalDate;
import java.util.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/organizations/{organizationId}")
@PreAuthorize("isAuthenticated()")
public class OrganizationOperationsController {
    private final CurrentUserService users;
    private final OrganizationOperationsQuery operations;
    private final OrganizationScheduleQuery schedule;

    public OrganizationOperationsController(
            CurrentUserService users,
            OrganizationOperationsQuery operations,
            OrganizationScheduleQuery schedule) {
        this.users = users;
        this.operations = operations;
        this.schedule = schedule;
    }

    @GetMapping("/overview")
    OrganizationOperationsQuery.Overview overview(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID organizationId) {
        return operations.overview(users.provision(jwt).id(), organizationId);
    }

    @GetMapping("/staff")
    List<OrganizationOperationsQuery.Staff> staff(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID organizationId) {
        return operations.staff(users.provision(jwt).id(), organizationId);
    }

    @GetMapping("/schedule")
    List<OrganizationScheduleQuery.Turn> schedule(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId,
            @RequestParam LocalDate date,
            @RequestParam(required = false) UUID spaceId) {
        return schedule.schedule(users.provision(jwt).id(), organizationId, date, spaceId);
    }
}
