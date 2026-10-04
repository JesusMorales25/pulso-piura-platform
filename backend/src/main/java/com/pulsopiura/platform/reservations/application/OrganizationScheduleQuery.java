package com.pulsopiura.platform.reservations.application;

import com.pulsopiura.platform.organizations.application.OrganizationAuthorization;
import com.pulsopiura.platform.organizations.domain.OrganizationPermission;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrganizationScheduleQuery {
    private final JdbcTemplate jdbc;
    private final OrganizationAuthorization authorization;

    public OrganizationScheduleQuery(JdbcTemplate jdbc, OrganizationAuthorization authorization) {
        this.jdbc = jdbc;
        this.authorization = authorization;
    }

    @Transactional(readOnly = true)
    public List<Turn> schedule(UUID actor, UUID organizationId, LocalDate date, UUID spaceId) {
        authorization.require(actor, organizationId, OrganizationPermission.OPERATE);
        if (spaceId != null
                && Boolean.FALSE.equals(
                        jdbc.queryForObject(
                                "select exists(select 1 from app.sport_spaces where id = ? and organization_id = ?)",
                                Boolean.class,
                                spaceId,
                                organizationId)))
            throw new NoSuchElementException("Cancha no encontrada en este complejo");
        return jdbc.query(
                """
            with slots as (
              select s.id space_id, s.name space_name, v.name venue_name, v.public_slug,
                v.status venue_status, s.status space_status, r.price_minor,
                (g.start_time at time zone o.timezone) starts_at,
                ((g.start_time + make_interval(mins => r.slot_minutes)) at time zone o.timezone) ends_at
              from app.sport_spaces s join app.venues v on v.id = s.venue_id and v.organization_id = s.organization_id
              join app.organizations o on o.id = s.organization_id
              join app.availability_rules r on r.sport_space_id = s.id and r.organization_id = s.organization_id
              cross join lateral generate_series(?::date + r.start_local_time,
                ?::date + r.end_local_time - make_interval(mins => r.slot_minutes),
                make_interval(mins => r.slot_minutes)) g(start_time)
              where s.organization_id = ? and (?::uuid is null or s.id = ?::uuid)
                and s.status <> 'ARCHIVED' and v.status <> 'ARCHIVED'
                and r.status = 'ACTIVE' and r.day_of_week = extract(isodow from ?::date)
                and r.valid_from <= ?::date and (r.valid_to is null or r.valid_to >= ?::date)
            )
            select slots.*, coalesce(price.price_minor, slots.price_minor) effective_price,
              case when booking.status in ('CONFIRMED','COMPLETED') then 'RENTED'
                   when booking.id is not null then 'PENDING'
                   when blocked.id is not null then 'MAINTENANCE' else 'FREE' end state,
              booking.id reservation_id, booking.total_minor,
              coalesce((select sum(p.amount_minor) from app.payment_orders p
                where p.reservation_id = booking.id
                  and p.status = 'PAID'), 0) paid_minor, u.display_name customer_name,
              blocked.reason,
              (booking.id is null and blocked.id is null and slots.starts_at > now()
               and venue_status = 'PUBLISHED' and space_status = 'PUBLISHED') bookable
            from slots
            left join lateral (select b.* from app.reservations b where b.organization_id = ?
              and b.sport_space_id = slots.space_id and b.starts_at < slots.ends_at and b.ends_at > slots.starts_at
              and (b.status in ('CONFIRMED','COMPLETED') or
                (b.status in ('HOLD','PENDING_PAYMENT') and (b.expires_at is null or b.expires_at > now())))
              order by b.created_at desc limit 1) booking on true
            left join app.users u on u.id = booking.customer_user_id
            left join lateral (select e.* from app.availability_exceptions e where e.organization_id = ?
              and e.sport_space_id = slots.space_id and e.status = 'ACTIVE' and e.type in ('MAINTENANCE','CLOSED')
              and e.starts_at < slots.ends_at and e.ends_at > slots.starts_at limit 1) blocked on true
            left join lateral (select e.price_minor from app.availability_exceptions e where e.organization_id = ?
              and e.sport_space_id = slots.space_id and e.status = 'ACTIVE' and e.type = 'SPECIAL_PRICE'
              and e.starts_at < slots.ends_at and e.ends_at > slots.starts_at
              order by e.starts_at desc, e.id limit 1) price on true
            order by starts_at, venue_name, space_name
            """,
                (rs, row) ->
                        new Turn(
                                rs.getObject("space_id", UUID.class),
                                rs.getString("space_name"),
                                rs.getString("venue_name"),
                                rs.getString("public_slug"),
                                rs.getTimestamp("starts_at").toInstant(),
                                rs.getTimestamp("ends_at").toInstant(),
                                rs.getLong("effective_price"),
                                rs.getString("state"),
                                rs.getObject("reservation_id", UUID.class),
                                rs.getString("customer_name"),
                                rs.getLong("total_minor"),
                                rs.getLong("paid_minor"),
                                rs.getString("reason"),
                                rs.getBoolean("bookable")),
                date,
                date,
                organizationId,
                spaceId,
                spaceId,
                date,
                date,
                date,
                organizationId,
                organizationId,
                organizationId);
    }

    public record Turn(
            UUID spaceId,
            String spaceName,
            String venueName,
            String publicSlug,
            Instant startsAt,
            Instant endsAt,
            long priceMinor,
            String state,
            UUID reservationId,
            String customerName,
            long totalMinor,
            long paidMinor,
            String reason,
            boolean bookable) {}
}
