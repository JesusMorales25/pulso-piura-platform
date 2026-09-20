package com.pulsopiura.platform.matches.api;

import com.pulsopiura.platform.identity.application.CurrentUserService;
import com.pulsopiura.platform.matches.application.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/matches")
public class MatchController {
    private final CurrentUserService users;
    private final MatchService matches;
    private final MatchParticipationService participation;
    private final MatchJoinPaymentService joinPayments;
    private final MatchOrganizerQueryService organizerQueries;
    private final MatchOrganizerManagementService organizerManagement;
    private final MatchActivityQueryService activityQueries;
    private final MatchOrganizerAuthorization organizerAuthorization;
    private final MatchInvitationService invitations;

    public MatchController(
            CurrentUserService users,
            MatchService matches,
            MatchParticipationService participation,
            MatchJoinPaymentService joinPayments,
            MatchOrganizerQueryService organizerQueries,
            MatchOrganizerManagementService organizerManagement,
            MatchActivityQueryService activityQueries,
            MatchOrganizerAuthorization organizerAuthorization,
            MatchInvitationService invitations) {
        this.users = users;
        this.matches = matches;
        this.participation = participation;
        this.joinPayments = joinPayments;
        this.organizerQueries = organizerQueries;
        this.organizerManagement = organizerManagement;
        this.activityQueries = activityQueries;
        this.organizerAuthorization = organizerAuthorization;
        this.invitations = invitations;
    }

    @GetMapping
    List<MatchView> catalog(@RequestParam(required = false) String sport) {
        return matches.publicCatalog(sport);
    }

    @GetMapping("/{publicSlug:[a-z0-9-]+}")
    MatchView detail(@AuthenticationPrincipal Jwt jwt, @PathVariable String publicSlug) {
        var actor = jwt == null ? null : users.provision(jwt).id();
        return matches.detail(publicSlug, actor);
    }

    @GetMapping("/mine")
    @PreAuthorize("isAuthenticated()")
    List<MatchView> mine(@AuthenticationPrincipal Jwt jwt) {
        var actor = users.provision(jwt).id();
        requireOrganizer(jwt, actor);
        return matches.organizerCatalog(actor);
    }

    @GetMapping("/{matchId:[0-9a-fA-F-]{36}}/participants")
    @PreAuthorize("isAuthenticated()")
    List<MatchOrganizerQueryService.ParticipantView> participants(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID matchId) {
        var actor = users.provision(jwt).id();
        requireOrganizer(jwt, actor);
        return organizerQueries.participants(actor, matchId);
    }

    @DeleteMapping("/{matchId:[0-9a-fA-F-]{36}}/participants/{userId:[0-9a-fA-F-]{36}}")
    @PreAuthorize("isAuthenticated()")
    ResponseEntity<Void> removeParticipant(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID matchId,
            @PathVariable UUID userId) {
        var actor = users.provision(jwt).id();
        requireOrganizer(jwt, actor);
        organizerManagement.removeParticipant(actor, matchId, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/participations/me")
    @PreAuthorize("isAuthenticated()")
    List<MatchActivityQueryService.ActivityView> activity(@AuthenticationPrincipal Jwt jwt) {
        return activityQueries.forPlayer(users.provision(jwt).id());
    }

    @GetMapping("/{publicSlug:[a-z0-9-]+}/participants/me")
    @PreAuthorize("isAuthenticated()")
    ResponseEntity<MatchParticipationView> currentParticipation(
            @AuthenticationPrincipal Jwt jwt, @PathVariable String publicSlug) {
        return participation
                .current(users.provision(jwt).id(), publicSlug)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/join-orders/capabilities")
    java.util.Map<String, Object> joinPaymentCapabilities() {
        return java.util.Map.of(
                "simulationEnabled",
                joinPayments.simulationEnabled(),
                "realPaymentsEnabled",
                false,
                "holdMinutes",
                5);
    }

    @GetMapping("/{publicSlug:[a-z0-9-]+}/join-orders/me")
    ResponseEntity<MatchJoinPaymentService.JoinOrderView> currentJoinOrder(
            @AuthenticationPrincipal Jwt jwt, @PathVariable String publicSlug) {
        return joinPayments
                .current(users.provision(jwt).id(), publicSlug)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PostMapping("/{publicSlug:[a-z0-9-]+}/join-orders")
    ResponseEntity<MatchJoinPaymentService.JoinOrderView> createJoinOrder(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String publicSlug,
            @Valid @RequestBody CreateJoinOrderRequest request,
            @RequestHeader("Idempotency-Key") String key) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(
                        joinPayments.start(
                                users.provision(jwt).id(), publicSlug, request.method(), key));
    }

    @PostMapping("/join-orders/{orderId:[0-9a-fA-F-]{36}}/simulate")
    MatchJoinPaymentService.JoinOrderView simulateJoinPayment(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID orderId) {
        return joinPayments.simulate(users.provision(jwt).id(), orderId);
    }

    @PostMapping
    ResponseEntity<MatchView> create(
            @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateMatchRequest request) {
        var actor = users.provision(jwt).id();
        requireOrganizer(jwt, actor);
        var view =
                matches.createDraft(
                        actor,
                        new MatchService.CreateCommand(
                                request.reservationId(),
                                request.title(),
                                request.skillLevel(),
                                request.minPlayers(),
                                request.maxPlayers(),
                                request.organizerCounts(),
                                request.priceMinor(),
                                request.visibility(),
                                request.cancellationPolicy()));
        return ResponseEntity.status(HttpStatus.CREATED).body(view);
    }

    @PostMapping("/{matchId:[0-9a-fA-F-]{36}}/publish")
    MatchView publish(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID matchId) {
        var actor = users.provision(jwt).id();
        requireOrganizer(jwt, actor);
        return matches.publish(actor, matchId);
    }

    @GetMapping("/{matchId:[0-9a-fA-F-]{36}}/invitations")
    List<MatchInvitationService.InvitationView> invitations(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID matchId) {
        var actor = users.provision(jwt).id();
        requireOrganizer(jwt, actor);
        return invitations.list(actor, matchId);
    }

    @PostMapping("/{matchId:[0-9a-fA-F-]{36}}/invitations")
    ResponseEntity<MatchInvitationService.InvitationView> invite(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID matchId,
            @Valid @RequestBody InviteToMatchRequest request) {
        var actor = users.provision(jwt).id();
        requireOrganizer(jwt, actor);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(invitations.invite(actor, matchId, request.email()));
    }

    @DeleteMapping("/{matchId:[0-9a-fA-F-]{36}}/invitations/{invitationId:[0-9a-fA-F-]{36}}")
    ResponseEntity<Void> revokeInvitation(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID matchId,
            @PathVariable UUID invitationId) {
        var actor = users.provision(jwt).id();
        requireOrganizer(jwt, actor);
        invitations.revoke(actor, matchId, invitationId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/invitations/{invitationId:[0-9a-fA-F-]{36}}/accept")
    MatchInvitationService.AcceptanceView acceptInvitation(
            @AuthenticationPrincipal Jwt jwt, @PathVariable UUID invitationId) {
        var user = users.provision(jwt);
        return invitations.accept(user.id(), user.email(), user.emailVerified(), invitationId);
    }

    @PostMapping("/{publicSlug:[a-z0-9-]+}/participants/me")
    MatchParticipationView join(@AuthenticationPrincipal Jwt jwt, @PathVariable String publicSlug) {
        return participation.join(users.provision(jwt).id(), publicSlug);
    }

    @DeleteMapping("/{publicSlug:[a-z0-9-]+}/participants/me")
    MatchParticipationView withdraw(
            @AuthenticationPrincipal Jwt jwt, @PathVariable String publicSlug) {
        return participation.withdraw(users.provision(jwt).id(), publicSlug);
    }

    private void requireOrganizer(Jwt jwt, UUID actor) {
        var realm = jwt.getClaimAsMap("realm_access");
        var rawRoles = realm == null ? null : realm.get("roles");
        var roles =
                rawRoles instanceof Collection<?> values
                        ? values.stream()
                                .filter(String.class::isInstance)
                                .map(String.class::cast)
                                .toList()
                        : List.<String>of();
        organizerAuthorization.requireOrganizer(actor, roles);
    }

    public record CreateMatchRequest(
            @NotNull UUID reservationId,
            @NotBlank @Size(max = 120) String title,
            @NotBlank String skillLevel,
            @Positive int minPlayers,
            @Positive int maxPlayers,
            boolean organizerCounts,
            @PositiveOrZero long priceMinor,
            @NotBlank String visibility,
            @NotBlank @Size(max = 500) String cancellationPolicy) {}

    public record CreateJoinOrderRequest(
            @NotNull com.pulsopiura.platform.matches.domain.MatchPaymentMethod method) {}

    public record InviteToMatchRequest(@NotBlank @Email String email) {}
}
