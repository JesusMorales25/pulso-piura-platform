package com.pulsopiura.platform.payments.application;

import static org.assertj.core.api.Assertions.*;

import com.pulsopiura.platform.matches.application.*;
import com.pulsopiura.platform.matches.domain.*;
import com.pulsopiura.platform.payments.application.ExternalPaymentModels.*;
import com.pulsopiura.platform.payments.domain.*;
import com.pulsopiura.platform.payments.infrastructure.persistence.ExternalPaymentStore;
import com.pulsopiura.platform.reservations.application.port.ReservationStore;
import com.pulsopiura.platform.reservations.domain.*;
import jakarta.persistence.EntityManager;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

/** Opt-in only: generated fixtures roll back; requires an isolated local PostgreSQL database. */
@SpringBootTest(
        properties = {
            "app.payments.mode=external_manual",
            "app.payments.proof-directory=${java.io.tmpdir}/pulso-external-proof-db-tests"
        })
@EnabledIfSystemProperty(named = "runExternalDatabaseTests", matches = "true")
@Transactional
class ExternalPaymentDatabaseTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired ExternalPaymentService payments;
    @Autowired ExternalPaymentStore proofs;
    @Autowired ReservationStore reservations;
    @Autowired MatchStore matches;
    @Autowired MatchActivityQueryService activity;
    @Autowired EntityManager entityManager;
    UUID owner, player, organization, venue, space;
    Instant now;

    @BeforeEach
    void fixture() throws Exception {
        try (var connection = Objects.requireNonNull(jdbc.getDataSource()).getConnection()) {
            assertThat(connection.getMetaData().getURL())
                    .as("Only an isolated local test database is supported")
                    .matches("jdbc:postgresql://(127\\.0\\.0\\.1|localhost):[0-9]+/.*test.*");
        }
        now = Instant.now();
        owner = user("Owner");
        player = user("Player");
        organization = UUID.randomUUID();
        venue = UUID.randomUUID();
        space = UUID.randomUUID();
        jdbc.update(
                "insert into app.organizations(id,name,slug,status,created_by,created_at,updated_at) values (?,?,?,'ACTIVE',?,now(),now())",
                organization,
                "DB Test",
                "test-" + organization,
                owner);
        jdbc.update(
                "insert into app.organization_memberships(id,organization_id,user_id,role,status,created_at) values (?,?,?,'OWNER','ACTIVE',now())",
                UUID.randomUUID(),
                organization,
                owner);
        jdbc.update(
                "insert into app.venues(id,organization_id,name,slug,public_slug,address,district_code,status,created_by,created_at,updated_at) values (?,?,?,?,?,?,?,'PUBLISHED',?,now(),now())",
                venue,
                organization,
                "Test Venue " + venue,
                "venue-" + venue,
                "public-" + venue,
                "Test address " + venue,
                "PIURA",
                owner);
        jdbc.update(
                "insert into app.sport_spaces(id,organization_id,venue_id,name,sport_code,format_code,capacity,status,created_by,created_at,updated_at) values (?,?,?,?,'FOOTBALL','FOOTBALL_7',14,'PUBLISHED',?,now(),now())",
                space,
                organization,
                venue,
                "Test court",
                owner);
    }

    UUID user(String name) {
        UUID id = UUID.randomUUID();
        jdbc.update(
                "insert into app.users(id,identity_subject,email,email_verified,display_name,status,created_at,updated_at) values (?,?,?,true,?,'ACTIVE',now(),now())",
                id,
                "db-test|" + id,
                id + "@example.test",
                name);
        return id;
    }

    Reservation reservation(UUID customer, int offset, long deposit) {
        var start = now.plusSeconds(86400L + offset * 7200L);
        return reservations.save(
                Reservation.hold(
                        organization,
                        space,
                        customer,
                        new ReservationTimeRange(start, start.plusSeconds(3600)),
                        ReservationMoney.pen(9000),
                        ReservationMoney.pen(deposit),
                        now.plusSeconds(600),
                        new ReservationIdempotencyKey(UUID.randomUUID().toString()),
                        "a".repeat(64),
                        now));
    }

    byte[] image(int color) throws Exception {
        var image = new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB);
        image.setRGB(0, 0, color);
        var bytes = new ByteArrayOutputStream();
        ImageIO.write(image, "png", bytes);
        return bytes.toByteArray();
    }

    Destination configureReservation() {
        return payments.configureOrganization(
                owner, organization, "Owner receiver", "999888777", true, true);
    }

    @Test
    void realReservationDepositAndBalanceAreAuditedIdempotentAndSummed() throws Exception {
        var r = reservation(player, 0, 2250);
        var recipient = configureReservation();
        var file = image(0x112233);
        var first =
                payments.submit(
                        player,
                        TargetType.RESERVATION,
                        r.id(),
                        PaymentMethod.YAPE,
                        PaymentPlan.DEPOSIT,
                        "OP-DEPOSIT",
                        "deposit-key",
                        recipient.version(),
                        file);
        assertThat(first.amountMinor()).isEqualTo(2250);
        assertThat(reservations.findByIdForUpdate(r.id()).orElseThrow().status())
                .isEqualTo(ReservationStatus.PENDING_PAYMENT_CONFIRMATION);
        assertThat(
                        payments.submit(
                                        player,
                                        TargetType.RESERVATION,
                                        r.id(),
                                        PaymentMethod.YAPE,
                                        PaymentPlan.DEPOSIT,
                                        "OP-DEPOSIT",
                                        "deposit-key",
                                        recipient.version(),
                                        file)
                                .id())
                .isEqualTo(first.id());
        payments.configureOrganization(
                owner, organization, "New receiver", "999888776", true, true);
        assertThat(proofs.get(first.id()).phone()).isEqualTo("999888777");
        assertThat(payments.decide(owner, first.id(), Decision.CONFIRMED, null).status())
                .isEqualTo("CONFIRMED");
        payments.decide(owner, first.id(), Decision.CONFIRMED, null);
        assertThat(
                        jdbc.queryForObject(
                                "select sum(amount_minor) from app.payment_orders where reservation_id=? and status='PAID' and simulated=false",
                                Long.class,
                                r.id()))
                .isEqualTo(2250);
        recipient = payments.destination(player, TargetType.RESERVATION, r.id());
        var balance =
                payments.submit(
                        player,
                        TargetType.RESERVATION,
                        r.id(),
                        PaymentMethod.PLIN,
                        PaymentPlan.BALANCE,
                        "OP-BALANCE",
                        "balance-key",
                        recipient.version(),
                        image(0x445566));
        assertThat(balance.amountMinor()).isEqualTo(6750);
        assertThat(reservations.findByIdForUpdate(r.id()).orElseThrow().status())
                .isEqualTo(ReservationStatus.CONFIRMED);
        payments.decide(owner, balance.id(), Decision.CONFIRMED, null);
        assertThat(
                        jdbc.queryForObject(
                                "select sum(amount_minor) from app.payment_orders where reservation_id=? and status='PAID' and simulated=false",
                                Long.class,
                                r.id()))
                .isEqualTo(9000);
        assertThat(
                        jdbc.queryForObject(
                                "select count(*) from app.external_payment_events where proof_id=? and action='CONFIRMED'",
                                Long.class,
                                first.id()))
                .isEqualTo(1);
    }

    @Test
    void correctedProofReusesSameOperationAndImageWithPreservedLineage() throws Exception {
        var r = reservation(player, 1, 2250);
        var recipient = configureReservation();
        var file = image(0x223344);
        var first =
                payments.submit(
                        player,
                        TargetType.RESERVATION,
                        r.id(),
                        PaymentMethod.YAPE,
                        PaymentPlan.FULL,
                        "OP-CORRECT",
                        "first-key",
                        recipient.version(),
                        file);
        payments.decide(
                owner, first.id(), Decision.CORRECTION_REQUIRED, "Adjunta la captura completa");
        assertThat(reservations.findByIdForUpdate(r.id()).orElseThrow().status())
                .isEqualTo(ReservationStatus.PENDING_PAYMENT);
        var replacement =
                payments.submit(
                        player,
                        TargetType.RESERVATION,
                        r.id(),
                        PaymentMethod.YAPE,
                        PaymentPlan.FULL,
                        "OP-CORRECT",
                        "replacement-key",
                        recipient.version(),
                        file);
        assertThat(replacement.id()).isNotEqualTo(first.id());
        assertThat(
                        jdbc.queryForObject(
                                "select supersedes_proof_id from app.external_payment_proofs where id=?",
                                UUID.class,
                                replacement.id()))
                .isEqualTo(first.id());
        assertThat(proofs.get(first.id()).status()).isEqualTo("CORRECTION_REQUIRED");
        payments.decide(owner, replacement.id(), Decision.CONFIRMED, "Verificado");
        assertThat(
                        proofs.referenceExists(
                                recipient.phone(),
                                "YAPE",
                                "OP-CORRECT",
                                player,
                                TargetType.RESERVATION,
                                r.id()))
                .isTrue();
        assertThat(proofs.list(TargetType.RESERVATION, r.id())).hasSize(2);
    }

    @Test
    void expiredReservationWithEvidenceRemainsInCustomerHistory() throws Exception {
        var r = reservation(player, 2, 2250);
        var recipient = configureReservation();
        var proof =
                payments.submit(
                        player,
                        TargetType.RESERVATION,
                        r.id(),
                        PaymentMethod.YAPE,
                        PaymentPlan.FULL,
                        "OP-LATE",
                        "late-key",
                        recipient.version(),
                        image(0x334455));
        jdbc.update(
                "update app.reservations set status='EXPIRED',expires_at=null where id=?", r.id());
        jdbc.update(
                "update app.external_payment_proofs set review_expires_at=? where id=?",
                Timestamp.from(now.minusSeconds(1)),
                proof.id());
        entityManager.clear();
        assertThat(reservations.findByCustomer(player, 0, 20))
                .extracting(Reservation::id)
                .contains(r.id());
        assertThat(reservations.countByCustomer(player)).isEqualTo(1);
        assertThat(payments.list(player, TargetType.RESERVATION, r.id()))
                .extracting(ProofView::status)
                .containsExactly("NEEDS_RESOLUTION");
        assertThat(
                        jdbc.queryForObject(
                                "select count(*) from app.payment_orders where reservation_id=?",
                                Long.class,
                                r.id()))
                .isZero();
    }

    @Test
    void matchProofAppearsBeforeJoiningAndConfirmationCreatesRealParticipantLedger()
            throws Exception {
        var r = reservation(owner, 3, 0);
        r.confirmWithoutPayment(now);
        r = reservations.save(r);
        var match =
                SportsMatch.draft(
                        organization,
                        r.id(),
                        space,
                        owner,
                        "Database match",
                        "FOOTBALL",
                        "FOOTBALL_7",
                        SkillLevel.ALL_LEVELS,
                        1,
                        4,
                        false,
                        1500,
                        MatchVisibility.PUBLIC,
                        "No refunds",
                        r.timeRange().startsAt(),
                        r.timeRange().endsAt(),
                        now);
        match.publish(owner, now);
        match = matches.save(match);
        var recipient =
                payments.configure(
                        owner,
                        TargetType.MATCH,
                        match.id(),
                        "Match receiver",
                        "999888775",
                        true,
                        true);
        var prepared =
                payments.prepare(
                        player,
                        TargetType.MATCH,
                        match.id(),
                        PaymentMethod.YAPE,
                        PaymentPlan.FULL,
                        "prepare-match-key");
        assertThat(prepared.amountMinor()).isEqualTo(1500);
        assertThat(prepared.expiresAt()).isBeforeOrEqualTo(Instant.now().plusSeconds(300));
        var proof =
                payments.submit(
                        player,
                        TargetType.MATCH,
                        match.id(),
                        PaymentMethod.YAPE,
                        PaymentPlan.FULL,
                        "OP-MATCH",
                        "match-key",
                        recipient.version(),
                        image(0x556677));
        var pending = activity.forPlayer(player);
        assertThat(pending).hasSize(1);
        assertThat(pending.getFirst().participationStatus()).isEqualTo("PENDING_REVIEW");
        assertThat(pending.getFirst().paidMinor()).isZero();
        assertThat(payments.decide(owner, proof.id(), Decision.CONFIRMED, null).status())
                .isEqualTo("CONFIRMED");
        var confirmed = activity.forPlayer(player);
        assertThat(confirmed).hasSize(1);
        assertThat(confirmed.getFirst().participationStatus()).isEqualTo("JOINED");
        assertThat(confirmed.getFirst().paidMinor()).isEqualTo(1500);
        assertThat(
                        jdbc.queryForObject(
                                "select simulated from app.match_join_orders where id=?",
                                Boolean.class,
                                proofs.get(proof.id()).ledgerOrderId()))
                .isFalse();
    }

    @Test
    void receiptReviewKeepsDatabaseOverlapProtection() throws Exception {
        var r = reservation(player, 4, 2250);
        var recipient = configureReservation();
        payments.submit(
                player,
                TargetType.RESERVATION,
                r.id(),
                PaymentMethod.YAPE,
                PaymentPlan.DEPOSIT,
                "OP-BLOCK",
                "block-key",
                recipient.version(),
                image(0x123456));
        entityManager.flush();
        assertThat(
                        reservations.findBlocking(
                                space,
                                r.timeRange().startsAt(),
                                r.timeRange().endsAt(),
                                Instant.now()))
                .extracting(Reservation::id)
                .contains(r.id());
        jdbc.execute(
                (org.springframework.jdbc.core.ConnectionCallback<Void>)
                        connection -> {
                            var savepoint = connection.setSavepoint();
                            try (var statement =
                                    connection.prepareStatement(
                                            "insert into app.reservations (id,organization_id,sport_space_id,customer_user_id,starts_at,ends_at,status,total_minor,deposit_minor,currency,expires_at,idempotency_key,request_fingerprint,created_at,updated_at) select ?,organization_id,sport_space_id,customer_user_id,starts_at,ends_at,'HOLD',total_minor,deposit_minor,currency,expires_at,?,request_fingerprint,created_at,updated_at from app.reservations where id=?")) {
                                statement.setObject(1, UUID.randomUUID());
                                statement.setString(2, "overlap-" + UUID.randomUUID());
                                statement.setObject(3, r.id());
                                assertThatThrownBy(statement::executeUpdate)
                                        .isInstanceOf(java.sql.SQLException.class)
                                        .satisfies(
                                                ex ->
                                                        assertThat(
                                                                        ((java.sql.SQLException) ex)
                                                                                .getSQLState())
                                                                .isEqualTo("23P01"));
                            } finally {
                                connection.rollback(savepoint);
                                connection.releaseSavepoint(savepoint);
                            }
                            return null;
                        });
    }

    @Test
    void preparationPersistsSnapshotAndOneActiveProofSurvivesReload() throws Exception {
        var r = reservation(player, 0, 2250);
        var recipient = configureReservation();
        var prepared =
                payments.prepare(
                        player,
                        TargetType.RESERVATION,
                        r.id(),
                        PaymentMethod.YAPE,
                        PaymentPlan.DEPOSIT,
                        "prepare-reload");
        payments.configureOrganization(
                owner, organization, "Changed receiver", "988777666", true, true);
        var recovered = payments.preparation(player, TargetType.RESERVATION, r.id());
        assertThat(recovered.preparation().amountMinor()).isEqualTo(prepared.amountMinor());
        assertThat(recovered.preparation().expiresAt())
                .isEqualTo(prepared.expiresAt().truncatedTo(java.time.temporal.ChronoUnit.MICROS));
        assertThat(recovered.preparation().destination().phone()).isEqualTo(recipient.phone());
        assertThat(payments.preparation(owner, TargetType.RESERVATION, r.id())).isNull();
        payments.configureOrganization(
                owner, organization, "Owner receiver", "999888777", true, true);
        var proof =
                payments.submit(
                        player,
                        TargetType.RESERVATION,
                        r.id(),
                        PaymentMethod.YAPE,
                        PaymentPlan.DEPOSIT,
                        "RELOAD-OP",
                        "reload-upload",
                        recipient.version(),
                        image(0xabcdef));
        assertThat(payments.preparation(player, TargetType.RESERVATION, r.id())).isNull();
        assertThat(payments.list(player, TargetType.RESERVATION, r.id()))
                .extracting(ProofView::id)
                .containsExactly(proof.id());
        assertThatThrownBy(
                        () ->
                                payments.submit(
                                        player,
                                        TargetType.RESERVATION,
                                        r.id(),
                                        PaymentMethod.YAPE,
                                        PaymentPlan.DEPOSIT,
                                        "OTHER-OP",
                                        "other-upload",
                                        recipient.version(),
                                        image(0x123456)))
                .hasMessageContaining("comprobante pendiente");
        assertThat(
                        jdbc.queryForObject(
                                "select count(*) from app.external_payment_proofs where target_id=?",
                                Long.class,
                                r.id()))
                .isEqualTo(1);

        jdbc.execute("SAVEPOINT duplicate_active_proof");
        try {
            assertThatThrownBy(
                            () ->
                                    jdbc.update(
                                            """
                insert into app.external_payment_proofs(id,target_type,target_id,receiver_id,payer_user_id,payer_name,amount_minor,method,plan,status,holder_name,phone,image_sha256,image_size,idempotency_key,created_at,review_expires_at)
                select gen_random_uuid(),target_type,target_id,receiver_id,payer_user_id,payer_name,amount_minor,method,plan,status,holder_name,phone,repeat('f',64),image_size,'bypass-new-key',created_at,review_expires_at
                from app.external_payment_proofs where id=?
                """,
                                            proof.id()))
                    .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class)
                    .hasMessageContaining("uq_external_payment_active_payer_target");
        } finally {
            jdbc.execute("ROLLBACK TO SAVEPOINT duplicate_active_proof");
        }
    }
}
