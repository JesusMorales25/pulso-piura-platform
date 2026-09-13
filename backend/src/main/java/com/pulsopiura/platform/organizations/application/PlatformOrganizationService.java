package com.pulsopiura.platform.organizations.application;

import com.pulsopiura.platform.audit.infrastructure.persistence.AuditEventEntity;
import com.pulsopiura.platform.audit.infrastructure.persistence.AuditEventRepository;
import java.time.Clock;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PlatformOrganizationService {
    private final JdbcTemplate jdbc;
    private final AuditEventRepository auditEvents;
    private final Clock clock = Clock.systemUTC();

    public PlatformOrganizationService(JdbcTemplate jdbc, AuditEventRepository auditEvents) {
        this.jdbc = jdbc;
        this.auditEvents = auditEvents;
    }

    @Transactional(readOnly = true)
    public List<OrganizationAdminView> organizations() {
        return jdbc.query(
                "select id, name, slug, status from app.organizations order by name",
                (rs, row) -> {
                    var id = rs.getObject("id", UUID.class);
                    return new OrganizationAdminView(
                            id,
                            rs.getString("name"),
                            rs.getString("slug"),
                            rs.getString("status"),
                            owners(id));
                });
    }

    @Transactional
    public OrganizationAdminView addOwner(UUID actor, UUID organizationId, String rawEmail) {
        lockOrganization(organizationId);
        var email = normalizeEmail(rawEmail);
        var userId =
                jdbc
                        .query(
                                "select id from app.users where lower(email) = ? and status = 'ACTIVE'",
                                (rs, row) -> rs.getObject("id", UUID.class),
                                email)
                        .stream()
                        .findFirst()
                        .orElseThrow(
                                () ->
                                        new java.util.NoSuchElementException(
                                                "Usuario no encontrado"));
        jdbc.update(
                """
                insert into app.organization_memberships
                  (id, organization_id, user_id, role, status, created_at, revoked_at, version)
                values (?, ?, ?, 'OWNER', 'ACTIVE', ?, null, 0)
                on conflict (organization_id, user_id) do update
                set role = 'OWNER', status = 'ACTIVE', revoked_at = null, version = app.organization_memberships.version + 1
                """,
                UUID.randomUUID(),
                organizationId,
                userId,
                clock.instant());
        auditEvents.save(
                AuditEventEntity.organizationAction(
                        actor, organizationId, "PLATFORM_OWNER_ASSIGNED"));
        return find(organizationId);
    }

    @Transactional
    public OrganizationAdminView removeOwner(UUID actor, UUID organizationId, UUID userId) {
        lockOrganization(organizationId);
        var ownerCount =
                jdbc.queryForObject(
                        "select count(*) from app.organization_memberships where organization_id = ? and role = 'OWNER' and status = 'ACTIVE'",
                        Long.class,
                        organizationId);
        if (ownerCount == null || ownerCount <= 1)
            throw new IllegalStateException(
                    "Asigna otro dueño antes de retirar al único propietario activo");
        var changed =
                jdbc.update(
                        """
                        update app.organization_memberships
                        set status = 'REVOKED', revoked_at = ?, version = version + 1
                        where organization_id = ? and user_id = ? and role = 'OWNER' and status = 'ACTIVE'
                        """,
                        clock.instant(),
                        organizationId,
                        userId);
        if (changed == 0) throw new java.util.NoSuchElementException("Dueño activo no encontrado");
        auditEvents.save(
                AuditEventEntity.organizationAction(
                        actor, organizationId, "PLATFORM_OWNER_REVOKED"));
        return find(organizationId);
    }

    private OrganizationAdminView find(UUID id) {
        return organizations().stream()
                .filter(organization -> organization.id().equals(id))
                .findFirst()
                .orElseThrow(
                        () -> new java.util.NoSuchElementException("Organización no encontrada"));
    }

    private List<OwnerView> owners(UUID organizationId) {
        return jdbc.query(
                """
                select u.id, u.display_name, u.email
                from app.organization_memberships membership
                join app.users u on u.id = membership.user_id
                where membership.organization_id = ? and membership.role = 'OWNER' and membership.status = 'ACTIVE'
                order by u.display_name
                """,
                (rs, row) ->
                        new OwnerView(
                                rs.getObject("id", UUID.class),
                                rs.getString("display_name"),
                                rs.getString("email")),
                organizationId);
    }

    private void lockOrganization(UUID id) {
        var organizationIds =
                jdbc.query(
                        "select id from app.organizations where id = ? for update",
                        (rs, row) -> rs.getObject("id", UUID.class),
                        id);
        if (organizationIds.isEmpty())
            throw new java.util.NoSuchElementException("Organización no encontrada");
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank() || !email.contains("@"))
            throw new IllegalArgumentException("Correo inválido");
        return email.trim().toLowerCase(Locale.ROOT);
    }

    public record OwnerView(UUID userId, String displayName, String email) {}

    public record OrganizationAdminView(
            UUID id, String name, String slug, String status, List<OwnerView> owners) {}
}
