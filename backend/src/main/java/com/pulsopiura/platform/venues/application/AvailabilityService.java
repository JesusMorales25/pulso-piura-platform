package com.pulsopiura.platform.venues.application;

import com.pulsopiura.platform.organizations.application.OrganizationAuthorization;
import com.pulsopiura.platform.organizations.domain.OrganizationPermission;
import com.pulsopiura.platform.venues.domain.AvailabilityExceptionType;
import com.pulsopiura.platform.venues.infrastructure.persistence.*;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AvailabilityService {
    private final SportSpaceRepository spaces;
    private final AvailabilityRuleRepository rules;
    private final AvailabilityExceptionRepository exceptions;
    private final OrganizationAuthorization authorization;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    @Autowired
    public AvailabilityService(
            SportSpaceRepository spaces,
            AvailabilityRuleRepository rules,
            AvailabilityExceptionRepository exceptions,
            OrganizationAuthorization authorization,
            ApplicationEventPublisher events) {
        this(spaces, rules, exceptions, authorization, events, Clock.systemUTC());
    }

    AvailabilityService(
            SportSpaceRepository spaces,
            AvailabilityRuleRepository rules,
            AvailabilityExceptionRepository exceptions,
            OrganizationAuthorization authorization,
            ApplicationEventPublisher events,
            Clock clock) {
        this.spaces = spaces;
        this.rules = rules;
        this.exceptions = exceptions;
        this.authorization = authorization;
        this.events = events;
        this.clock = clock;
    }

    @Transactional
    public AvailabilityRuleView createRule(
            UUID actorId,
            UUID organizationId,
            UUID spaceId,
            int dayOfWeek,
            LocalTime startLocalTime,
            LocalTime endLocalTime,
            int slotMinutes,
            long priceMinor,
            LocalDate validFrom,
            LocalDate validTo) {
        authorization.require(actorId, organizationId, OrganizationPermission.MANAGE_ORGANIZATION);
        requireConfigurableSpace(organizationId, spaceId);
        var rule =
                AvailabilityRuleEntity.create(
                        organizationId,
                        spaceId,
                        actorId,
                        dayOfWeek,
                        startLocalTime,
                        endLocalTime,
                        slotMinutes,
                        priceMinor,
                        validFrom,
                        validTo,
                        clock.instant());
        ensureRuleDoesNotOverlap(organizationId, spaceId, rule);
        var saved = rules.save(rule);
        audit(
                actorId,
                organizationId,
                "AVAILABILITY_RULE_CREATED",
                "AVAILABILITY_RULE",
                saved.id());
        return view(saved);
    }

    @Transactional(readOnly = true)
    public List<AvailabilityRuleView> listRules(UUID actorId, UUID organizationId, UUID spaceId) {
        authorization.require(actorId, organizationId, OrganizationPermission.VIEW);
        requireSpace(organizationId, spaceId);
        return rules
                .findAllByOrganizationIdAndSportSpaceIdOrderByDayOfWeekAscStartLocalTimeAsc(
                        organizationId, spaceId)
                .stream()
                .map(this::view)
                .toList();
    }

    @Transactional
    public void deactivateRule(
            UUID actorId, UUID organizationId, UUID spaceId, UUID ruleId, long version) {
        authorization.require(actorId, organizationId, OrganizationPermission.MANAGE_ORGANIZATION);
        requireConfigurableSpace(organizationId, spaceId);
        var rule =
                rules.findByIdAndOrganizationId(ruleId, organizationId)
                        .filter(candidate -> candidate.sportSpaceId().equals(spaceId))
                        .orElseThrow(
                                () ->
                                        new NoSuchElementException(
                                                "Regla de disponibilidad no encontrada"));
        rule.deactivate(version, clock.instant());
        audit(
                actorId,
                organizationId,
                "AVAILABILITY_RULE_DEACTIVATED",
                "AVAILABILITY_RULE",
                ruleId);
    }

    @Transactional
    public AvailabilityExceptionView createException(
            UUID actorId,
            UUID organizationId,
            UUID spaceId,
            Instant startsAt,
            Instant endsAt,
            String rawType,
            Long priceMinor,
            String reason) {
        var type = AvailabilityExceptionType.parse(rawType);
        var permission =
                type == AvailabilityExceptionType.SPECIAL_PRICE
                        ? OrganizationPermission.MANAGE_ORGANIZATION
                        : OrganizationPermission.OPERATE;
        authorization.require(actorId, organizationId, permission);
        requireConfigurableSpace(organizationId, spaceId);
        var exception =
                AvailabilityExceptionEntity.create(
                        organizationId,
                        spaceId,
                        actorId,
                        startsAt,
                        endsAt,
                        type.name(),
                        priceMinor,
                        reason,
                        clock.instant());
        var saved = exceptions.save(exception);
        audit(
                actorId,
                organizationId,
                "AVAILABILITY_EXCEPTION_CREATED",
                "AVAILABILITY_EXCEPTION",
                saved.id());
        return view(saved);
    }

    @Transactional(readOnly = true)
    public List<AvailabilityExceptionView> listExceptions(
            UUID actorId, UUID organizationId, UUID spaceId) {
        authorization.require(actorId, organizationId, OrganizationPermission.VIEW);
        requireSpace(organizationId, spaceId);
        return exceptions
                .findAllByOrganizationIdAndSportSpaceIdOrderByStartsAtAsc(organizationId, spaceId)
                .stream()
                .map(this::view)
                .toList();
    }

    @Transactional
    public void cancelException(
            UUID actorId, UUID organizationId, UUID spaceId, UUID exceptionId, long version) {
        authorization.require(actorId, organizationId, OrganizationPermission.OPERATE);
        requireConfigurableSpace(organizationId, spaceId);
        var exception =
                exceptions
                        .findByIdAndOrganizationId(exceptionId, organizationId)
                        .filter(candidate -> candidate.sportSpaceId().equals(spaceId))
                        .orElseThrow(() -> new NoSuchElementException("Excepción no encontrada"));
        if (exception.type() == AvailabilityExceptionType.SPECIAL_PRICE) {
            authorization.require(
                    actorId, organizationId, OrganizationPermission.MANAGE_ORGANIZATION);
        }
        exception.cancel(version, clock.instant());
        audit(
                actorId,
                organizationId,
                "AVAILABILITY_EXCEPTION_CANCELLED",
                "AVAILABILITY_EXCEPTION",
                exceptionId);
    }

    private SportSpaceEntity requireSpace(UUID organizationId, UUID spaceId) {
        return spaces.findByIdAndOrganizationId(spaceId, organizationId)
                .orElseThrow(() -> new NoSuchElementException("Cancha no encontrada"));
    }

    private SportSpaceEntity requireConfigurableSpace(UUID organizationId, UUID spaceId) {
        var space = requireSpace(organizationId, spaceId);
        space.requireConfigurable();
        return space;
    }

    private void ensureRuleDoesNotOverlap(
            UUID organizationId, UUID spaceId, AvailabilityRuleEntity candidate) {
        var overlaps =
                rules
                        .findAllByOrganizationIdAndSportSpaceIdOrderByDayOfWeekAscStartLocalTimeAsc(
                                organizationId, spaceId)
                        .stream()
                        .filter(rule -> "ACTIVE".equals(rule.status()))
                        .filter(rule -> rule.dayOfWeek() == candidate.dayOfWeek())
                        .filter(
                                rule ->
                                        candidate.startLocalTime().isBefore(rule.endLocalTime())
                                                && rule.startLocalTime()
                                                        .isBefore(candidate.endLocalTime()))
                        .anyMatch(rule -> validityOverlaps(rule, candidate));
        if (overlaps) {
            throw new IllegalStateException(
                    "La regla se superpone con otro horario activo de la cancha");
        }
    }

    private boolean validityOverlaps(AvailabilityRuleEntity first, AvailabilityRuleEntity second) {
        var firstEndsAfterSecondStarts =
                first.validTo() == null || !first.validTo().isBefore(second.validFrom());
        var secondEndsAfterFirstStarts =
                second.validTo() == null || !second.validTo().isBefore(first.validFrom());
        return firstEndsAfterSecondStarts && secondEndsAfterFirstStarts;
    }

    private AvailabilityRuleView view(AvailabilityRuleEntity rule) {
        return new AvailabilityRuleView(
                rule.id(),
                rule.sportSpaceId(),
                rule.dayOfWeek(),
                rule.startLocalTime(),
                rule.endLocalTime(),
                rule.slotMinutes(),
                rule.priceMinor(),
                rule.currency(),
                rule.validFrom(),
                rule.validTo(),
                rule.status(),
                rule.version());
    }

    private AvailabilityExceptionView view(AvailabilityExceptionEntity exception) {
        return new AvailabilityExceptionView(
                exception.id(),
                exception.sportSpaceId(),
                exception.startsAt(),
                exception.endsAt(),
                exception.type().name(),
                exception.priceMinor(),
                exception.currency(),
                exception.reason(),
                exception.status(),
                exception.version());
    }

    private void audit(
            UUID actorId,
            UUID organizationId,
            String action,
            String resourceType,
            UUID resourceId) {
        events.publishEvent(
                new VenueAuditEvent(actorId, organizationId, action, resourceType, resourceId));
    }
}
