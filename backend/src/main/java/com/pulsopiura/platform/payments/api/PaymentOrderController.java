package com.pulsopiura.platform.payments.api;

import com.pulsopiura.platform.identity.application.CurrentUserService;
import com.pulsopiura.platform.payments.application.PaymentOrderService;
import com.pulsopiura.platform.payments.domain.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/payment-orders")
public class PaymentOrderController {
    private final CurrentUserService users;
    private final PaymentOrderService payments;

    public PaymentOrderController(CurrentUserService users, PaymentOrderService payments) {
        this.users = users;
        this.payments = payments;
    }

    @GetMapping("/capabilities")
    Map<String, Object> capabilities() {
        return Map.of(
                "simulationEnabled", payments.simulationEnabled(), "realPaymentsEnabled", false);
    }

    @GetMapping
    List<PaymentOrderService.PaymentOrderView> list(
            @AuthenticationPrincipal Jwt jwt, @RequestParam UUID reservationId) {
        return payments.list(users.provision(jwt).id(), reservationId);
    }

    @GetMapping("/{orderId}")
    PaymentOrderService.PaymentOrderView get(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID orderId) {
        return payments.get(users.provision(jwt).id(), orderId);
    }

    @PostMapping
    PaymentOrderService.PaymentOrderView create(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreatePaymentRequest request,
            @RequestHeader("Idempotency-Key") String key,
            @RequestHeader(value = "X-Correlation-Id", required = false) String correlationId) {
        return payments.create(
                users.provision(jwt).id(),
                request.reservationId(),
                request.method(),
                request.plan(),
                key,
                correlationId);
    }

    @PostMapping("/{orderId}/simulate")
    PaymentOrderService.PaymentOrderView simulate(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID orderId,
            @RequestHeader(value = "X-Correlation-Id", required = false) String correlationId) {
        return payments.simulate(users.provision(jwt).id(), orderId, correlationId);
    }

    public record CreatePaymentRequest(
            @NotNull UUID reservationId,
            @NotNull PaymentMethod method,
            @NotNull PaymentPlan plan) {}
}
