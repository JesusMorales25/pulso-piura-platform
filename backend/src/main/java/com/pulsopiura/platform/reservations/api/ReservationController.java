package com.pulsopiura.platform.reservations.api;

import com.pulsopiura.platform.identity.application.CurrentUserService;
import com.pulsopiura.platform.reservations.application.CreateReservationService;
import com.pulsopiura.platform.reservations.application.ReservationConflictException;
import com.pulsopiura.platform.reservations.application.ReservationQueryService;
import com.pulsopiura.platform.reservations.application.ReservationTransitionService;
import com.pulsopiura.platform.reservations.application.ReservationView;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/reservations")
public class ReservationController {
    private final CurrentUserService users;
    private final CreateReservationService reservations;
    private final ReservationQueryService queries;
    private final ReservationTransitionService transitions;

    public ReservationController(
            CurrentUserService users,
            CreateReservationService reservations,
            ReservationQueryService queries,
            ReservationTransitionService transitions) {
        this.users = users;
        this.reservations = reservations;
        this.queries = queries;
        this.transitions = transitions;
    }

    @GetMapping("/{reservationId}")
    ReservationView get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID reservationId) {
        return queries.get(users.provision(jwt).id(), reservationId);
    }

    @PostMapping("/{reservationId}/confirm")
    ReservationView confirm(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID reservationId,
            @RequestHeader(value = "X-Correlation-Id", required = false) String correlationId) {
        var result = transitions.confirm(users.provision(jwt).id(), reservationId, correlationId);
        if ("EXPIRED".equals(result.status())) {
            throw new ReservationConflictException("El tiempo para confirmar la reserva venció");
        }
        return result;
    }

    @PostMapping("/{reservationId}/cancel")
    ReservationView cancel(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID reservationId,
            @RequestHeader(value = "X-Correlation-Id", required = false) String correlationId) {
        return transitions.cancel(users.provision(jwt).id(), reservationId, correlationId);
    }

    @PostMapping
    ResponseEntity<ReservationView> create(
            @AuthenticationPrincipal Jwt jwt,
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @RequestHeader(value = "X-Correlation-Id", required = false) String correlationId,
            @Valid @RequestBody CreateReservationRequest request) {
        var result =
                reservations.create(
                        users.provision(jwt).id(),
                        request.sportSpaceId(),
                        request.startsAt(),
                        request.endsAt(),
                        idempotencyKey,
                        correlationId);
        return ResponseEntity.status(result.replayed() ? HttpStatus.OK : HttpStatus.CREATED)
                .body(result.reservation());
    }

    public record CreateReservationRequest(
            @NotNull UUID sportSpaceId, @NotNull Instant startsAt, @NotNull Instant endsAt) {}
}
