package com.pulsopiura.platform.reservations.api;

import com.pulsopiura.platform.identity.application.CurrentUserService;
import com.pulsopiura.platform.reservations.application.ReservationCheckInService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class ReservationCheckInController {
    private final CurrentUserService users;
    private final ReservationCheckInService checkIns;

    public ReservationCheckInController(
            CurrentUserService users, ReservationCheckInService checkIns) {
        this.users = users;
        this.checkIns = checkIns;
    }

    @PostMapping("/reservations/{reservationId}/check-in-pass")
    ReservationCheckInService.CheckInPass issue(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID reservationId) {
        return checkIns.issue(users.provision(jwt).id(), reservationId);
    }

    @PostMapping("/organizations/{organizationId}/reservations/check-in/preview")
    ReservationCheckInService.CheckInReservation preview(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId,
            @Valid @RequestBody ScanRequest request) {
        return checkIns.preview(users.provision(jwt).id(), organizationId, request.payload());
    }

    @PostMapping("/organizations/{organizationId}/reservations/check-in")
    ReservationCheckInService.CheckInReservation checkIn(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId,
            @Valid @RequestBody ScanRequest request,
            @RequestHeader(value = "X-Correlation-Id", required = false) String correlationId) {
        return checkIns.checkIn(
                users.provision(jwt).id(), organizationId, request.payload(), correlationId);
    }

    public record ScanRequest(@NotBlank @Size(max = 100) String payload) {}
}
