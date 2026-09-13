package com.pulsopiura.platform.reservations.api;

import com.pulsopiura.platform.identity.application.CurrentUserService;
import com.pulsopiura.platform.reservations.application.ReservationQueryService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me/reservations")
public class MyReservationController {
    private final CurrentUserService users;
    private final ReservationQueryService reservations;

    public MyReservationController(CurrentUserService users, ReservationQueryService reservations) {
        this.users = users;
        this.reservations = reservations;
    }

    @GetMapping
    ReservationQueryService.ReservationPage list(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return reservations.listOwn(users.provision(jwt).id(), page, size);
    }
}
