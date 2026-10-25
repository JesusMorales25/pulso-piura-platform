package com.pulsopiura.platform.payments.api;

import com.pulsopiura.platform.identity.application.CurrentUserService;
import com.pulsopiura.platform.payments.application.ExternalPaymentModels.*;
import com.pulsopiura.platform.payments.application.ExternalPaymentService;
import com.pulsopiura.platform.payments.domain.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.io.IOException;
import java.util.*;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/external-payments")
public class ExternalPaymentController {
    private final CurrentUserService users;
    private final ExternalPaymentService payments;

    public ExternalPaymentController(CurrentUserService users, ExternalPaymentService payments) {
        this.users = users;
        this.payments = payments;
    }

    @GetMapping("/capabilities")
    public Map<String, Object> capabilities() {
        return Map.of("enabled", payments.enabled(), "reviewMinutes", payments.reviewMinutes());
    }

    @GetMapping("/destination")
    public Destination destination(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam TargetType targetType,
            @RequestParam UUID targetId) {
        return payments.destination(users.provision(jwt).id(), targetType, targetId);
    }

    @GetMapping("/preparation")
    public ResponseEntity<PreparationState> preparation(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam TargetType targetType,
            @RequestParam UUID targetId) {
        var saved = payments.preparation(users.provision(jwt).id(), targetType, targetId);
        return saved == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(saved);
    }

    @PostMapping("/prepare")
    public Preparation prepare(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody PrepareRequest request,
            @RequestHeader("Idempotency-Key") String key) {
        return payments.prepare(
                users.provision(jwt).id(),
                request.targetType(),
                request.targetId(),
                request.method(),
                request.plan(),
                key);
    }

    public record PrepareRequest(
            @NotNull TargetType targetType,
            @NotNull UUID targetId,
            @NotNull PaymentMethod method,
            @NotNull PaymentPlan plan) {}

    @PutMapping("/destination")
    public Destination configure(
            @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody DestinationRequest request) {
        return payments.configure(
                users.provision(jwt).id(),
                request.targetType(),
                request.targetId(),
                request.holderName(),
                request.phone(),
                request.yapeEnabled(),
                request.plinEnabled());
    }

    @GetMapping
    public List<ProofView> list(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam TargetType targetType,
            @RequestParam UUID targetId) {
        return payments.list(users.provision(jwt).id(), targetType, targetId);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ProofView submit(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam TargetType targetType,
            @RequestParam UUID targetId,
            @RequestParam PaymentMethod method,
            @RequestParam PaymentPlan plan,
            @RequestParam(required = false) String reference,
            @RequestHeader("Idempotency-Key") String key,
            @RequestParam String destinationVersion,
            @RequestPart MultipartFile file)
            throws IOException {
        if (file.getSize() > 5 * 1024 * 1024L)
            throw new IllegalArgumentException("La imagen debe pesar como máximo 5 MB");
        return payments.submit(
                users.provision(jwt).id(),
                targetType,
                targetId,
                method,
                plan,
                reference,
                key,
                destinationVersion,
                file.getBytes());
    }

    @PostMapping("/{proofId}/decision")
    public ProofView decide(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID proofId,
            @Valid @RequestBody DecisionRequest request) {
        return payments.decide(
                users.provision(jwt).id(), proofId, request.decision(), request.note());
    }

    @GetMapping(value = "/{proofId}/image", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> image(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID proofId) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .header("X-Content-Type-Options", "nosniff")
                .contentType(MediaType.IMAGE_PNG)
                .body(payments.image(users.provision(jwt).id(), proofId));
    }

    public record DestinationRequest(
            @NotNull TargetType targetType,
            @NotNull UUID targetId,
            String holderName,
            String phone,
            boolean yapeEnabled,
            boolean plinEnabled) {}

    public record DecisionRequest(@NotNull Decision decision, String note) {}
}
