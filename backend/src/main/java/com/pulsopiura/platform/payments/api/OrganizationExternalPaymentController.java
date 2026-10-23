package com.pulsopiura.platform.payments.api;

import com.pulsopiura.platform.identity.application.CurrentUserService;
import com.pulsopiura.platform.payments.application.ExternalPaymentModels.Destination;
import com.pulsopiura.platform.payments.application.ExternalPaymentService;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/organizations/{organizationId}/external-payment-destination")
public class OrganizationExternalPaymentController {
    private final CurrentUserService users;
    private final ExternalPaymentService payments;

    public OrganizationExternalPaymentController(
            CurrentUserService users, ExternalPaymentService payments) {
        this.users = users;
        this.payments = payments;
    }

    @GetMapping
    public Destination get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID organizationId) {
        return payments.organizationDestination(users.provision(jwt).id(), organizationId);
    }

    @PutMapping
    public Destination put(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId,
            @RequestBody Request request) {
        return payments.configureOrganization(
                users.provision(jwt).id(),
                organizationId,
                request.holderName(),
                request.phone(),
                request.yapeEnabled(),
                request.plinEnabled());
    }

    public record Request(
            String holderName, String phone, boolean yapeEnabled, boolean plinEnabled) {}
}
