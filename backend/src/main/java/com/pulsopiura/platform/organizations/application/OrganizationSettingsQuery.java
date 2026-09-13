package com.pulsopiura.platform.organizations.application;

import com.pulsopiura.platform.organizations.infrastructure.persistence.OrganizationRepository;
import java.time.ZoneId;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrganizationSettingsQuery {
    private final OrganizationRepository organizations;

    public OrganizationSettingsQuery(OrganizationRepository organizations) {
        this.organizations = organizations;
    }

    @Transactional(readOnly = true)
    public ZoneId requireActiveTimezone(UUID organizationId) {
        var organization =
                organizations
                        .findById(organizationId)
                        .filter(item -> "ACTIVE".equals(item.status()))
                        .orElseThrow(
                                () -> new NoSuchElementException("Organización no encontrada"));
        return ZoneId.of(organization.timezone());
    }
}
