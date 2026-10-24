package com.pulsopiura.platform.reservations.infrastructure.persistence;

import static org.assertj.core.api.Assertions.*;

import com.pulsopiura.platform.reservations.application.ReservationDashboard.Filter;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
@EnabledIfSystemProperty(named = "runDatabaseTests", matches = "true")
class ReservationDashboardDatabaseTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired JdbcReservationDashboardQuery query;

    @Test
    void globalCountsMatchEveryPaginatedFilterAndExpiredHoldsRemainVisible() throws Exception {
        try (var connection =
                java.util.Objects.requireNonNull(jdbc.getDataSource()).getConnection()) {
            assertThat(connection.getMetaData().getURL())
                    .as("Only an isolated local test database is supported")
                    .matches("jdbc:postgresql://(127\\.0\\.0\\.1|localhost):[0-9]+/.*test.*");
        }
        UUID organization = UUID.randomUUID(),
                venue = UUID.randomUUID(),
                space = UUID.randomUUID(),
                actor = UUID.randomUUID();
        jdbc.update(
                "insert into app.users(id,identity_subject,email,display_name,status,created_at,updated_at) values (?,?,?,?,'ACTIVE',now(),now())",
                actor,
                "dashboard-test|" + actor,
                actor + "@example.test",
                "Dashboard player");
        jdbc.update(
                "insert into app.organizations(id,name,slug,status,created_by,created_at,updated_at) values (?,?,?,'ACTIVE',?,now(),now())",
                organization,
                "Dashboard test",
                "dashboard-" + organization,
                actor);
        jdbc.update(
                "insert into app.venues(id,organization_id,name,slug,public_slug,address,district_code,status,created_by,created_at,updated_at) values (?,?,?,?,?,?,?,'PUBLISHED',?,now(),now())",
                venue,
                organization,
                "Dashboard venue",
                "venue-" + venue,
                "public-" + venue,
                "Test address",
                "PIURA",
                actor);
        jdbc.update(
                "insert into app.sport_spaces(id,organization_id,venue_id,name,sport_code,format_code,capacity,status,created_by,created_at,updated_at) values (?,?,?,?,'FOOTBALL','FOOTBALL_7',14,'PUBLISHED',?,now(),now())",
                space,
                organization,
                venue,
                "Dashboard court",
                actor);
        var before = query.own(actor, null, 0, 10);
        UUID expired = UUID.randomUUID();
        for (int i = 0; i < 18; i++) {
            UUID id = i == 17 ? expired : UUID.randomUUID();
            String status =
                    i == 17
                            ? "HOLD"
                            : i == 16
                                    ? "PENDING_PAYMENT_CONFIRMATION"
                                    : i == 15 ? "CANCELLED" : "CONFIRMED";
            jdbc.update(
                    """
                insert into app.reservations(id,organization_id,sport_space_id,customer_user_id,starts_at,ends_at,status,total_minor,deposit_minor,currency,expires_at,idempotency_key,request_fingerprint,created_at,updated_at,version)
                values(?,?,?,?,now()+interval '30 years'+?*interval '2 hours',now()+interval '30 years'+(?*2+1)*interval '1 hour',?,1000,200,'PEN',case when ? in ('HOLD','PENDING_PAYMENT_CONFIRMATION') then now()-interval '1 minute' else null end,?, ?,now(),now(),3)
                """,
                    id,
                    organization,
                    space,
                    actor,
                    i,
                    i,
                    status,
                    status,
                    id.toString(),
                    "a".repeat(64));
        }
        jdbc.update(
                "insert into app.payment_orders(id,reservation_id,payer_user_id,amount_minor,currency,method,status,created_at,updated_at,paid_at,plan,installment,idempotency_key) select gen_random_uuid(),id,customer_user_id,200,'PEN','YAPE','PAID',now(),now(),now(),'DEPOSIT','INITIAL',id::text from app.reservations where customer_user_id=? and status in ('CONFIRMED','CANCELLED')",
                actor);
        var summary = query.own(actor, null, 0, 10);
        assertThat(summary.counts().paid()).isEqualTo(16);
        assertThat(summary.counts().balance()).isEqualTo(15);
        assertThat(summary.paidMinor()).isEqualTo(3200);
        assertThat(summary.balanceMinor()).isEqualTo(12000);
        assertThat(summary.retainedMinor()).isEqualTo(200);
        assertThat(summary.items()).isEmpty();
        assertThat(summary.counts().all()).isEqualTo(before.counts().all() + 18);
        assertThat(summary.counts().expired()).isEqualTo(before.counts().expired() + 2);
        assertThat(summary.counts().confirmed()).isEqualTo(before.counts().confirmed() + 15);
        for (var filter : Filter.values()) {
            var first = query.own(actor, filter, 0, 10);
            assertThat(first.total()).isEqualTo(summary.counts().total(filter));
            long seen = 0;
            for (int page = 0; page * 10L < first.total(); page++)
                seen += query.own(actor, filter, page, 10).items().size();
            assertThat(seen).isEqualTo(first.total());
            var owner = query.organization(organization, filter, 0, 10);
            assertThat(owner.total()).isEqualTo(owner.counts().total(filter));
        }
        var expiredPage = query.own(actor, Filter.EXPIRED, 0, 50);
        assertThat(expiredPage.items())
                .anySatisfy(
                        r -> {
                            assertThat(r.id()).isEqualTo(expired);
                            assertThat(r.status()).isEqualTo("EXPIRED");
                            assertThat(r.version()).isEqualTo(3);
                            assertThat(r.spaceName()).isNotBlank();
                        });
    }
}
