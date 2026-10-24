package com.pulsopiura.platform.reservations.infrastructure.persistence;

import com.pulsopiura.platform.reservations.application.ReservationDashboard;
import com.pulsopiura.platform.reservations.application.ReservationDashboard.Counts;
import com.pulsopiura.platform.reservations.application.ReservationDashboard.Filter;
import com.pulsopiura.platform.reservations.application.ReservationQueryService.OrganizationReservationView;
import com.pulsopiura.platform.reservations.application.ReservationView;
import com.pulsopiura.platform.reservations.application.port.ReservationDashboardQuery;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
class JdbcReservationDashboardQuery implements ReservationDashboardQuery {
    private final JdbcTemplate jdbc;

    JdbcReservationDashboardQuery(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // Both statements share a PostgreSQL transaction snapshot and transaction timestamp.
    private String scoped(String scope) {
        return """
            with scoped as (
                select r.*, case when r.status in ('HOLD','PENDING_PAYMENT','PENDING_PAYMENT_CONFIRMATION')
                  and r.expires_at <= now() then 'EXPIRED' else r.status end as effective_status,
                  coalesce(p.paid,0) as paid
                from app.reservations r
                left join lateral (select sum(amount_minor) as paid from app.payment_orders
                  where reservation_id=r.id and status='PAID') p on true
                where r.%s=?
            )
            """
                .formatted(scope);
    }

    public ReservationDashboard<ReservationView> own(
            UUID actor, Filter filter, int page, int size) {
        return load(
                "customer_user_id",
                actor,
                filter,
                page,
                size,
                (r, i) ->
                        new ReservationView(
                                r.getObject("id", UUID.class),
                                r.getObject("sport_space_id", UUID.class),
                                instant(r, "starts_at"),
                                instant(r, "ends_at"),
                                r.getString("effective_status"),
                                r.getLong("total_minor"),
                                r.getLong("deposit_minor"),
                                r.getString("currency"),
                                instant(r, "expires_at"),
                                r.getLong("version"),
                                r.getLong("paid"),
                                r.getString("venue_name"),
                                r.getString("space_name"),
                                r.getObject("capacity", Integer.class),
                                r.getBoolean("match_associated")));
    }

    public ReservationDashboard<OrganizationReservationView> organization(
            UUID organization, Filter filter, int page, int size) {
        return load(
                "organization_id",
                organization,
                filter,
                page,
                size,
                (r, i) ->
                        new OrganizationReservationView(
                                r.getObject("id", UUID.class),
                                r.getObject("sport_space_id", UUID.class),
                                r.getString("space_name"),
                                r.getString("venue_name"),
                                r.getObject("customer_user_id", UUID.class),
                                r.getString("customer_email"),
                                instant(r, "starts_at"),
                                instant(r, "ends_at"),
                                r.getString("effective_status"),
                                r.getLong("total_minor"),
                                r.getLong("deposit_minor"),
                                r.getString("currency"),
                                instant(r, "expires_at"),
                                r.getLong("paid")));
    }

    private <T> ReservationDashboard<T> load(
            String scope, UUID id, Filter filter, int page, int size, RowMapper<T> mapper) {
        var aggregate =
                jdbc.queryForObject(
                        scoped(scope)
                                + """
            select count(*) as all_count,
              count(*) filter (where effective_status='CONFIRMED') as confirmed,
              count(*) filter (where effective_status in ('HOLD','PENDING_PAYMENT')) as pending,
              count(*) filter (where effective_status='PENDING_PAYMENT_CONFIRMATION') as confirmation,
              count(*) filter (where effective_status='CANCELLED') as cancelled,
              count(*) filter (where effective_status='COMPLETED') as completed,
              count(*) filter (where effective_status='EXPIRED') as expired,
              count(*) filter (where paid>0) as paid_count,
              count(*) filter (where effective_status in ('CONFIRMED','COMPLETED') and total_minor>paid) as balance_count,
              coalesce(sum(paid),0) as paid_minor,
              coalesce(sum(case when effective_status in ('CONFIRMED','COMPLETED') then greatest(total_minor-paid,0) else 0 end),0) as balance_minor,
              coalesce(sum(case when effective_status='CANCELLED' then paid else 0 end),0) as retained_minor
            from scoped
            """,
                        (r, i) ->
                                new Aggregate(
                                        new Counts(
                                                r.getLong("all_count"),
                                                r.getLong("confirmed"),
                                                r.getLong("pending"),
                                                r.getLong("confirmation"),
                                                r.getLong("cancelled"),
                                                r.getLong("completed"),
                                                r.getLong("expired"),
                                                r.getLong("paid_count"),
                                                r.getLong("balance_count")),
                                        r.getLong("paid_minor"),
                                        r.getLong("balance_minor"),
                                        r.getLong("retained_minor")),
                        id);
        List<T> items =
                filter == null
                        ? List.of()
                        : jdbc.query(
                                scoped(scope)
                                        + """
            select r.*, s.name as space_name, s.capacity, v.name as venue_name, u.email as customer_email,
              exists(select 1 from app.sports_matches m where m.reservation_id=r.id) as match_associated
            from scoped r join app.sport_spaces s on s.id=r.sport_space_id
            join app.venues v on v.id=s.venue_id join app.users u on u.id=r.customer_user_id
            where
            """
                                        + predicate(filter)
                                        + " order by r.starts_at desc, r.id desc limit ? offset ?",
                                mapper,
                                id,
                                size,
                                (long) page * size);
        return new ReservationDashboard<>(
                aggregate.counts(),
                aggregate.paid(),
                aggregate.balance(),
                aggregate.retained(),
                items,
                aggregate.counts().total(filter),
                page,
                size);
    }

    private String predicate(Filter filter) {
        return switch (filter) {
            case ALL -> "true";
            case PENDING_PAYMENT -> "effective_status in ('HOLD','PENDING_PAYMENT')";
            case PAID -> "paid>0";
            case BALANCE -> "effective_status in ('CONFIRMED','COMPLETED') and total_minor>paid";
            default -> "effective_status='" + filter.name() + "'";
        };
    }

    private static Instant instant(ResultSet row, String column) throws SQLException {
        var value = row.getTimestamp(column);
        return value == null ? null : value.toInstant();
    }

    private record Aggregate(Counts counts, long paid, long balance, long retained) {}
}
