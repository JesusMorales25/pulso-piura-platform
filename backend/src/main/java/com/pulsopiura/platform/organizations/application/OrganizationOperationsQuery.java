package com.pulsopiura.platform.organizations.application;

import com.pulsopiura.platform.organizations.domain.OrganizationPermission;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrganizationOperationsQuery {
    private final JdbcTemplate jdbc;
    private final OrganizationAuthorization authorization;

    public OrganizationOperationsQuery(JdbcTemplate jdbc, OrganizationAuthorization authorization) {
        this.jdbc = jdbc;
        this.authorization = authorization;
    }

    @Transactional(readOnly = true)
    public Overview overview(UUID actor, UUID organizationId) {
        authorization.require(actor, organizationId, OrganizationPermission.VIEW);
        return jdbc.queryForObject(
                """
            select
              (select string_agg(distinct concat_ws(' · ', address, district_code), ' / ')
                from app.venues where organization_id = o.id and status <> 'ARCHIVED') locations,
              (select count(*) from app.venues where organization_id = o.id and status <> 'ARCHIVED') venues,
              (select count(*) from app.sport_spaces where organization_id = o.id and status = 'PUBLISHED') spaces,
              (select count(*) from app.organization_memberships where organization_id = o.id and status = 'ACTIVE') members,
              (select count(*) from app.sports_matches where organization_id = o.id and status = 'PUBLISHED'
                and (starts_at at time zone o.timezone)::date = (now() at time zone o.timezone)::date) matches,
              (select count(*) from app.reservations where organization_id = o.id and status in ('CONFIRMED','COMPLETED')
                and (starts_at at time zone o.timezone)::date = (now() at time zone o.timezone)::date) reservations,
              (select coalesce(sum(total_minor),0) from app.reservations where organization_id = o.id and status in ('CONFIRMED','COMPLETED')
                and (starts_at at time zone o.timezone)::date = (now() at time zone o.timezone)::date) expected
            from app.organizations o where o.id = ?
            """,
                (rs, row) ->
                        new Overview(
                                rs.getLong("venues"),
                                rs.getLong("spaces"),
                                rs.getLong("members"),
                                rs.getLong("matches"),
                                rs.getLong("reservations"),
                                rs.getLong("expected"),
                                rs.getString("locations")),
                organizationId);
    }

    @Transactional(readOnly = true)
    public List<Staff> staff(UUID actor, UUID organizationId) {
        authorization.require(actor, organizationId, OrganizationPermission.MANAGE_MEMBERS);
        return jdbc.query(
                """
            select u.id, u.display_name, u.email, u.avatar_url, m.role,
                   (u.id = o.created_by and m.role = 'OWNER') principal
            from app.organization_memberships m join app.users u on u.id = m.user_id
            join app.organizations o on o.id = m.organization_id
            where m.organization_id = ? and m.status = 'ACTIVE'
            order by principal desc, m.created_at, u.id
            """,
                (rs, row) ->
                        new Staff(
                                rs.getObject("id", UUID.class),
                                rs.getString("display_name"),
                                rs.getString("email"),
                                rs.getString("avatar_url"),
                                rs.getString("role"),
                                rs.getBoolean("principal")),
                organizationId);
    }

    public record Overview(
            long venues,
            long spaces,
            long members,
            long matchesToday,
            long reservationsToday,
            long expectedMinor,
            String locations) {}

    public record Staff(
            UUID userId,
            String displayName,
            String email,
            String avatarUrl,
            String role,
            boolean principal) {}
}
