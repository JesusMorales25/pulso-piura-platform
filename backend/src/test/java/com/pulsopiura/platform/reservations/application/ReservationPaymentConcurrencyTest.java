package com.pulsopiura.platform.reservations.application;

import static org.assertj.core.api.Assertions.*;

import com.pulsopiura.platform.payments.application.PaymentOrderService;
import com.pulsopiura.platform.payments.domain.*;
import com.pulsopiura.platform.reservations.domain.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.Supplier;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Opt-in against a local seeded PostgreSQL database. Only generated reservation IDs are removed.
 */
@SpringBootTest(properties = "app.payments.mode=simulation")
@EnabledIfSystemProperty(named = "runDatabaseTests", matches = "true")
class ReservationPaymentConcurrencyTest {
    @Autowired ReservationCreationTransaction creation;
    @Autowired ReservationTransitionService transitions;
    @Autowired PaymentOrderService payments;
    @Autowired JdbcTemplate jdbc;
    private final List<UUID> ids = new ArrayList<>();
    private UUID organization, space, owner;

    @BeforeEach
    void fixture() throws Exception {
        try (var connection = Objects.requireNonNull(jdbc.getDataSource()).getConnection()) {
            assertThat(connection.getMetaData().getURL())
                    .matches("jdbc:postgresql://(127\\.0\\.0\\.1|localhost):[0-9]+/.*");
        }
        var rows =
                jdbc.query(
                        "select s.organization_id,s.id,m.user_id from app.sport_spaces s join app.organization_memberships m on m.organization_id=s.organization_id and m.role='OWNER' and m.status='ACTIVE' where s.status='PUBLISHED' limit 1",
                        (row, index) ->
                                List.of(
                                        row.getObject(1, UUID.class),
                                        row.getObject(2, UUID.class),
                                        row.getObject(3, UUID.class)));
        assertThat(rows)
                .as(
                        "A published court with an active owner is required; seed the local database first")
                .hasSize(1);
        organization = rows.getFirst().get(0);
        space = rows.getFirst().get(1);
        owner = rows.getFirst().get(2);
    }

    private Reservation candidate(Instant start) {
        var now = Instant.now();
        var value =
                Reservation.hold(
                        organization,
                        space,
                        owner,
                        new ReservationTimeRange(start, start.plusSeconds(3600)),
                        ReservationMoney.pen(9001),
                        ReservationMoney.pen(2251),
                        now.plusSeconds(600),
                        new ReservationIdempotencyKey(UUID.randomUUID().toString()),
                        ReservationRequestFingerprint.calculate(
                                space, start, start.plusSeconds(3600)),
                        now);
        ids.add(value.id());
        return value;
    }

    private Instant slot() {
        return Instant.now().plusSeconds(86400L * 730 + new Random().nextInt(86400));
    }

    private List<Object> race(Supplier<?> first, Supplier<?> second) throws Exception {
        try (var executor = Executors.newFixedThreadPool(2)) {
            var gate = new CountDownLatch(1);
            Callable<Object> a =
                    () -> {
                        gate.await();
                        try {
                            return first.get();
                        } catch (RuntimeException error) {
                            return error;
                        }
                    };
            Callable<Object> b =
                    () -> {
                        gate.await();
                        try {
                            return second.get();
                        } catch (RuntimeException error) {
                            return error;
                        }
                    };
            var fa = executor.submit(a);
            var fb = executor.submit(b);
            gate.countDown();
            return List.of(fa.get(30, TimeUnit.SECONDS), fb.get(30, TimeUnit.SECONDS));
        }
    }

    @AfterEach
    void cleanup() {
        for (var id : ids) {
            jdbc.update(
                    "delete from app.payment_status_history where payment_order_id in (select id from app.payment_orders where reservation_id=?)",
                    id);
            jdbc.update("delete from app.payment_orders where reservation_id=?", id);
            jdbc.update("delete from app.reservation_status_history where reservation_id=?", id);
            jdbc.update("delete from app.reservations where id=?", id);
        }
    }

    @Test
    void overlappingHoldsOnlyHaveOneWinner() throws Exception {
        var start = slot();
        var a = candidate(start);
        var b = candidate(start);
        var results =
                race(
                        () -> creation.create(a, owner, "race-a", Instant.now()),
                        () -> creation.create(b, owner, "race-b", Instant.now()));
        assertThat(results.stream().filter(Reservation.class::isInstance).count()).isEqualTo(1);
        assertThat(
                        jdbc.queryForObject(
                                "select count(*) from app.reservations where id in (?,?)",
                                Long.class,
                                a.id(),
                                b.id()))
                .isEqualTo(1);
    }

    @Test
    void independentCourtsOrTimesCanProceedTogether() throws Exception {
        var start = slot();
        var a = candidate(start);
        var b = candidate(start.plusSeconds(3600));
        assertThat(
                        race(
                                        () ->
                                                creation.create(
                                                        a, owner, "adjacent-a", Instant.now()),
                                        () ->
                                                creation.create(
                                                        b, owner, "adjacent-b", Instant.now()))
                                .stream()
                                .filter(Reservation.class::isInstance)
                                .count())
                .isEqualTo(2);
    }

    @Test
    void duplicatePaymentRequestsProduceOnePaymentAndOneAudit() throws Exception {
        var r = creation.create(candidate(slot()), owner, "hold", Instant.now());
        var order =
                payments.create(
                        owner,
                        r.id(),
                        PaymentMethod.YAPE,
                        PaymentPlan.DEPOSIT,
                        UUID.randomUUID().toString(),
                        "order");
        var results =
                race(
                        () -> payments.simulate(owner, order.id(), "pay-a"),
                        () -> payments.simulate(owner, order.id(), "pay-b"));
        assertThat(results).allMatch(PaymentOrderService.PaymentOrderView.class::isInstance);
        assertThat(
                        jdbc.queryForObject(
                                "select count(*) from app.payment_status_history where payment_order_id=? and new_status='PAID'",
                                Long.class,
                                order.id()))
                .isEqualTo(1);
        assertThat(
                        jdbc.queryForObject(
                                "select sum(amount_minor) from app.payment_orders where reservation_id=? and status='PAID'",
                                Long.class,
                                r.id()))
                .isEqualTo(2251);
    }

    @Test
    void ownerCancellationAndPaymentAreSerialized() throws Exception {
        var r = creation.create(candidate(slot()), owner, "hold", Instant.now());
        var order =
                payments.create(
                        owner,
                        r.id(),
                        PaymentMethod.PLIN,
                        PaymentPlan.FULL,
                        UUID.randomUUID().toString(),
                        "order");
        var results =
                race(
                        () -> payments.simulate(owner, order.id(), "pay"),
                        () -> transitions.cancelForOwner(owner, organization, r.id(), "cancel"));
        assertThat(results.stream().filter(RuntimeException.class::isInstance).count())
                .isEqualTo(1);
        var status =
                jdbc.queryForObject(
                        "select status from app.reservations where id=?", String.class, r.id());
        var paid =
                jdbc.queryForObject(
                        "select count(*) from app.payment_orders where reservation_id=? and status='PAID'",
                        Long.class,
                        r.id());
        assertThat(status).isIn("CONFIRMED", "CANCELLED");
        assertThat(paid).isEqualTo("CONFIRMED".equals(status) ? 1 : 0);
    }

    @Test
    void expiredPendingPaymentCannotChargeAfterSlotIsReassigned() {
        var start = slot();
        var r = creation.create(candidate(start), owner, "hold", Instant.now());
        var order =
                payments.create(
                        owner,
                        r.id(),
                        PaymentMethod.YAPE,
                        PaymentPlan.FULL,
                        UUID.randomUUID().toString(),
                        "order");
        jdbc.update(
                "update app.reservations set expires_at=created_at + interval '1 millisecond' where id=?",
                r.id());
        var next = creation.create(candidate(start), owner, "new-hold", Instant.now());
        assertThatThrownBy(() -> payments.simulate(owner, order.id(), "expired"))
                .isInstanceOf(ReservationConflictException.class);
        assertThat(
                        jdbc.queryForObject(
                                "select status from app.payment_orders where id=?",
                                String.class,
                                order.id()))
                .isEqualTo("PENDING");
        assertThat(
                        jdbc.queryForObject(
                                "select status from app.reservations where id=?",
                                String.class,
                                next.id()))
                .isEqualTo("HOLD");
    }
}
