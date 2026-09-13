package com.pulsopiura.platform.organizations.application;

import com.pulsopiura.platform.organizations.domain.OrganizationPermission;
import com.pulsopiura.platform.organizations.infrastructure.persistence.*;
import java.text.Normalizer;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrganizationService {
    private final OrganizationRepository organizations;
    private final MembershipRepository memberships;
    private final OrganizationAuthorization authorization;
    private final Clock clock;

    @Autowired
    public OrganizationService(
            OrganizationRepository organizations,
            MembershipRepository memberships,
            OrganizationAuthorization authorization) {
        this(organizations, memberships, authorization, Clock.systemUTC());
    }

    OrganizationService(
            OrganizationRepository organizations,
            MembershipRepository memberships,
            OrganizationAuthorization authorization,
            Clock clock) {
        this.organizations = organizations;
        this.memberships = memberships;
        this.authorization = authorization;
        this.clock = clock;
    }

    @Transactional
    public OrganizationView create(UUID actorId, String rawName) {
        var name = requireName(rawName);
        var slug = uniqueSlug(name);
        var organization =
                organizations.saveAndFlush(
                        OrganizationEntity.create(name, slug, actorId, clock.instant()));
        var membership =
                memberships.save(
                        MembershipEntity.owner(organization.id(), actorId, clock.instant()));
        return view(organization, membership.role().name());
    }

    @Transactional(readOnly = true)
    public List<OrganizationView> listFor(UUID actorId) {
        return memberships.findAllByUserIdAndStatus(actorId, "ACTIVE").stream()
                .map(
                        m ->
                                organizations
                                        .findById(m.organizationId())
                                        .map(o -> view(o, m.role().name())))
                .flatMap(Optional::stream)
                .toList();
    }

    @Transactional(readOnly = true)
    public OrganizationView get(UUID actorId, UUID organizationId) {
        var role = authorization.require(actorId, organizationId, OrganizationPermission.VIEW);
        var organization =
                organizations
                        .findById(organizationId)
                        .orElseThrow(
                                () -> new NoSuchElementException("Organización no encontrada"));
        return view(organization, role.name());
    }

    private String requireName(String rawName) {
        if (rawName == null || rawName.isBlank())
            throw new IllegalArgumentException("El nombre es obligatorio");
        var name = rawName.trim();
        if (name.length() > 160)
            throw new IllegalArgumentException("El nombre excede 160 caracteres");
        return name;
    }

    private String uniqueSlug(String name) {
        var base =
                Normalizer.normalize(name, Normalizer.Form.NFD)
                        .replaceAll("\\p{M}", "")
                        .toLowerCase(Locale.ROOT)
                        .replaceAll("[^a-z0-9]+", "-")
                        .replaceAll("(^-|-$)", "");
        if (base.isBlank()) base = "organizacion";
        var candidate = base;
        for (int suffix = 2; organizations.existsBySlug(candidate); suffix++)
            candidate = base + "-" + suffix;
        return candidate;
    }

    private OrganizationView view(OrganizationEntity organization, String role) {
        return new OrganizationView(
                organization.id(),
                organization.name(),
                organization.slug(),
                organization.status(),
                organization.timezone(),
                role);
    }
}
