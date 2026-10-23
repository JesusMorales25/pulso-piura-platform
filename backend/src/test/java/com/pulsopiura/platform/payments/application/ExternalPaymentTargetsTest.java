package com.pulsopiura.platform.payments.application;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.pulsopiura.platform.matches.application.*;
import com.pulsopiura.platform.matches.domain.SportsMatch;
import com.pulsopiura.platform.organizations.application.OrganizationAuthorization;
import com.pulsopiura.platform.organizations.domain.*;
import com.pulsopiura.platform.payments.application.ExternalPaymentModels.*;
import com.pulsopiura.platform.payments.domain.*;
import com.pulsopiura.platform.payments.infrastructure.persistence.*;
import com.pulsopiura.platform.reservations.application.*;
import com.pulsopiura.platform.reservations.application.port.*;
import com.pulsopiura.platform.reservations.domain.*;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.access.AccessDeniedException;

class ExternalPaymentTargetsTest {
    final MatchStore matches = mock(MatchStore.class);
    final MatchAccessPolicy access = mock(MatchAccessPolicy.class);
    final ExternalMatchPaymentService matchPayments = mock(ExternalMatchPaymentService.class);
    final ReservationStore reservations = mock(ReservationStore.class);
    final ReservationHistoryStore history = mock(ReservationHistoryStore.class);
    final ReservationTransitionService transitions = mock(ReservationTransitionService.class);
    final PaymentOrderRepository payments = mock(PaymentOrderRepository.class);
    final PaymentAuditStore audit = mock(PaymentAuditStore.class);
    final OrganizationAuthorization organizations = mock(OrganizationAuthorization.class);
    final ExternalPaymentTargets service =
            new ExternalPaymentTargets(
                    matches,
                    access,
                    matchPayments,
                    reservations,
                    history,
                    transitions,
                    payments,
                    audit,
                    organizations);
    final Instant now = Instant.now();
    final UUID actor = UUID.randomUUID(), owner = UUID.randomUUID(), org = UUID.randomUUID();

    Reservation hold() {
        return Reservation.hold(
                org,
                UUID.randomUUID(),
                actor,
                new ReservationTimeRange(now.plusSeconds(7200), now.plusSeconds(10800)),
                ReservationMoney.pen(9000),
                ReservationMoney.pen(2250),
                now.plusSeconds(600),
                new ReservationIdempotencyKey("reservation-key"),
                "a".repeat(64),
                now);
    }

    ExternalPaymentTargets.Context context(Reservation r) {
        return new ExternalPaymentTargets.Context(TargetType.RESERVATION, r.id(), org, null, r);
    }

    Proof proof(Reservation r, String plan, long amount, Instant expiry) {
        return new Proof(
                UUID.randomUUID(),
                TargetType.RESERVATION,
                r.id(),
                org,
                actor,
                "Jugador",
                amount,
                "YAPE",
                plan,
                "PENDING_REVIEW",
                null,
                "Receptor",
                "999888777",
                "proof.png",
                "a".repeat(64),
                120,
                "proof-key",
                null,
                now,
                expiry,
                null,
                null);
    }

    @Test
    void reservationPreparationDoesNotExtendTheExistingHold() {
        var r = hold();
        var oldDeadline = r.expiresAt();
        var result =
                service.prepare(
                        context(r),
                        actor,
                        PaymentMethod.YAPE,
                        PaymentPlan.DEPOSIT,
                        "prepare-key",
                        now,
                        now.plusSeconds(300));
        assertThat(result.amountMinor()).isEqualTo(2250);
        assertThat(result.expiresAt()).isEqualTo(now.plusSeconds(300));
        assertThat(r.expiresAt()).isEqualTo(oldDeadline);
        assertThat(r.status()).isEqualTo(ReservationStatus.HOLD);
        verify(reservations, never()).save(any());
    }

    @Test
    void reservationPreparationRejectsExpiredHoldBeforeRevealingPaymentInstructions() {
        var r = hold();
        assertThatThrownBy(
                        () ->
                                service.prepare(
                                        context(r),
                                        actor,
                                        PaymentMethod.YAPE,
                                        PaymentPlan.FULL,
                                        "prepare-key",
                                        now.plusSeconds(601),
                                        now.plusSeconds(901)))
                .hasMessageContaining("venció");
    }

    @Test
    void reservationReviewerRequiresActiveOwnerRoleWithoutPlatformBypass() {
        var c = context(hold());
        when(organizations.require(owner, org, OrganizationPermission.VIEW))
                .thenReturn(OrganizationRole.ADMIN);
        assertThat(service.reviewer(c, owner)).isFalse();
        when(organizations.require(owner, org, OrganizationPermission.VIEW))
                .thenReturn(OrganizationRole.OPERATOR);
        assertThat(service.reviewer(c, owner)).isFalse();
        when(organizations.require(owner, org, OrganizationPermission.VIEW))
                .thenReturn(OrganizationRole.OWNER);
        assertThat(service.reviewer(c, owner)).isTrue();
        when(organizations.require(owner, org, OrganizationPermission.VIEW))
                .thenThrow(new AccessDeniedException("revoked"));
        assertThat(service.reviewer(c, owner)).isFalse();
    }

    @Test
    void matchReviewerIsActualOrganizerAndDoesNotConsultOrganizationRole() {
        var match = mock(SportsMatch.class);
        when(match.organizerUserId()).thenReturn(owner);
        var c =
                new ExternalPaymentTargets.Context(
                        TargetType.MATCH, UUID.randomUUID(), org, match, null);
        assertThat(service.reviewer(c, owner)).isTrue();
        assertThat(service.reviewer(c, actor)).isFalse();
        verifyNoInteractions(organizations);
    }

    @Test
    void submissionCalculatesDepositAndExtendsOnlyLiveHold() {
        var r = hold();
        var deadline = now.plusSeconds(1800);
        var result =
                service.hold(
                        context(r),
                        actor,
                        PaymentMethod.YAPE,
                        PaymentPlan.DEPOSIT,
                        "proof-key",
                        now,
                        deadline);
        assertThat(result.amountMinor()).isEqualTo(2250);
        assertThat(r.status()).isEqualTo(ReservationStatus.PENDING_PAYMENT);
        assertThat(r.expiresAt()).isEqualTo(deadline);
        verify(reservations).save(r);
        verify(history).append(any());
    }

    @Test
    void expiredReservationNeverRegainsItsHoldOnSubmission() {
        var r = hold();
        assertThatThrownBy(
                        () ->
                                service.hold(
                                        context(r),
                                        actor,
                                        PaymentMethod.YAPE,
                                        PaymentPlan.FULL,
                                        "proof-key",
                                        now.plusSeconds(601),
                                        now.plusSeconds(2400)))
                .isInstanceOf(IllegalStateException.class);
        verify(reservations, never()).save(any());
    }

    @Test
    void expiredOrCancelledReservationConfirmationNeverCreatesPaidLedger() {
        var r = hold();
        r.holdForExternalReview(now, now.plusSeconds(1800));
        r.cancel(now.plusSeconds(1));
        assertThat(
                        service.confirm(
                                context(r),
                                proof(r, "FULL", 9000, now.plusSeconds(1800)),
                                owner,
                                now.plusSeconds(2)))
                .isFalse();
        verify(payments, never()).saveAndFlush(any());
        verifyNoInteractions(transitions);
    }

    @Test
    void balanceUsesConfirmedLedgerAndWritesRealPaymentExactlyOnce() {
        var r = hold();
        r.startPayment(now);
        r.confirmPaid(now.plusSeconds(1));
        when(payments.sumPaid(r.id())).thenReturn(2250L);
        var c = context(r);
        var p = proof(r, "BALANCE", 6750, now.plusSeconds(1800));
        assertThat(
                        service.hold(
                                        c,
                                        actor,
                                        PaymentMethod.YAPE,
                                        PaymentPlan.BALANCE,
                                        "balance-key",
                                        now.plusSeconds(2),
                                        now.plusSeconds(1800))
                                .amountMinor())
                .isEqualTo(6750);
        assertThat(service.confirm(c, p, owner, now.plusSeconds(3))).isTrue();
        var captor = ArgumentCaptor.forClass(PaymentOrderEntity.class);
        verify(payments).saveAndFlush(captor.capture());
        assertThat(captor.getValue().amountMinor()).isEqualTo(6750);
        assertThat(captor.getValue().status()).isEqualTo("PAID");
        assertThat(captor.getValue().simulated()).isFalse();
        verifyNoInteractions(transitions);
    }

    @Test
    void simulatedReservationPaymentPreventsMixingRealMoney() {
        var r = hold();
        var simulated =
                PaymentOrderEntity.create(
                        r.id(),
                        actor,
                        2250,
                        PaymentMethod.YAPE,
                        PaymentPlan.DEPOSIT,
                        "sim-key",
                        now);
        when(payments.findAllByReservationIdOrderByCreatedAtAsc(r.id()))
                .thenReturn(List.of(simulated));
        assertThatThrownBy(
                        () ->
                                service.hold(
                                        context(r),
                                        actor,
                                        PaymentMethod.YAPE,
                                        PaymentPlan.FULL,
                                        "proof-key",
                                        now,
                                        now.plusSeconds(1800)))
                .hasMessageContaining("orden de prueba");
        verify(reservations, never()).save(any());
    }
}
