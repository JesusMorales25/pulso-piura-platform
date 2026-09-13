package com.pulsopiura.platform.organizations.application;

import com.pulsopiura.platform.organizations.domain.*;
import com.pulsopiura.platform.organizations.infrastructure.persistence.*;
import java.time.*;
import java.util.*;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MembershipService {
    private final MembershipRepository memberships;
    private final InvitationRepository invitations;
    private final OrganizationAuthorization authorization;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    public MembershipService(
            MembershipRepository memberships,
            InvitationRepository invitations,
            OrganizationAuthorization authorization,
            ApplicationEventPublisher events) {
        this.memberships = memberships;
        this.invitations = invitations;
        this.authorization = authorization;
        this.events = events;
        this.clock = Clock.systemUTC();
    }

    @Transactional
    public InvitationView invite(
            UUID actorId, UUID organizationId, String rawEmail, String rawRole) {
        authorization.require(actorId, organizationId, OrganizationPermission.MANAGE_MEMBERS);
        var email = normalizeEmail(rawEmail);
        var role = parseAssignableRole(rawRole);
        if (invitations.existsByOrganizationIdAndEmailIgnoreCaseAndStatus(
                organizationId, email, "PENDING"))
            throw new IllegalArgumentException(
                    "Ya existe una invitación pendiente para este correo");
        try {
            var invitation =
                    invitations.saveAndFlush(
                            InvitationEntity.create(
                                    organizationId, email, role, actorId, clock.instant()));
            events.publishEvent(
                    new OrganizationAuditEvent(actorId, organizationId, "MEMBERSHIP_INVITED"));
            return view(invitation);
        } catch (DataIntegrityViolationException conflict) {
            throw new IllegalArgumentException(
                    "Ya existe una invitación pendiente para este correo", conflict);
        }
    }

    @Transactional
    public MemberView accept(UUID actorId, String actorEmail, UUID invitationId) {
        var invitation =
                invitations
                        .findById(invitationId)
                        .orElseThrow(() -> new NoSuchElementException("Invitación no encontrada"));
        invitation.accept(actorId, actorEmail, clock.instant());
        var membership =
                memberships
                        .findByOrganizationIdAndUserId(invitation.organizationId(), actorId)
                        .map(
                                existing -> {
                                    existing.reactivate(invitation.role());
                                    return existing;
                                })
                        .orElseGet(
                                () ->
                                        memberships.save(
                                                MembershipEntity.create(
                                                        invitation.organizationId(),
                                                        actorId,
                                                        invitation.role(),
                                                        clock.instant())));
        events.publishEvent(
                new OrganizationAuditEvent(
                        actorId, invitation.organizationId(), "MEMBERSHIP_ACCEPTED"));
        return new MemberView(
                membership.organizationId(), membership.userId(), membership.role().name());
    }

    @Transactional(readOnly = true)
    public List<MemberView> list(UUID actorId, UUID organizationId) {
        authorization.require(actorId, organizationId, OrganizationPermission.MANAGE_MEMBERS);
        return memberships.findAllByOrganizationIdAndStatus(organizationId, "ACTIVE").stream()
                .map(m -> new MemberView(m.organizationId(), m.userId(), m.role().name()))
                .toList();
    }

    @Transactional
    public void revoke(UUID actorId, UUID organizationId, UUID userId) {
        authorization.require(actorId, organizationId, OrganizationPermission.MANAGE_MEMBERS);
        var membership =
                memberships
                        .findByOrganizationIdAndUserIdAndStatus(organizationId, userId, "ACTIVE")
                        .orElseThrow(
                                () -> new NoSuchElementException("Membresía activa no encontrada"));
        membership.revoke(clock.instant());
        events.publishEvent(
                new OrganizationAuditEvent(actorId, organizationId, "MEMBERSHIP_REVOKED"));
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank() || !email.contains("@"))
            throw new IllegalArgumentException("Correo inválido");
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private OrganizationRole parseAssignableRole(String role) {
        try {
            var parsed =
                    OrganizationRole.valueOf(
                            role == null ? "" : role.trim().toUpperCase(Locale.ROOT));
            if (parsed == OrganizationRole.OWNER)
                throw new IllegalArgumentException("OWNER no se asigna por invitación");
            return parsed;
        } catch (IllegalArgumentException error) {
            throw new IllegalArgumentException("El rol debe ser ADMIN u OPERATOR");
        }
    }

    private InvitationView view(InvitationEntity invitation) {
        return new InvitationView(
                invitation.id(),
                invitation.organizationId(),
                invitation.email(),
                invitation.role().name(),
                invitation.status(),
                invitation.expiresAt());
    }
}
