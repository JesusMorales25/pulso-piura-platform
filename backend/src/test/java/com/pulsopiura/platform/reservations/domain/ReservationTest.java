package com.pulsopiura.platform.reservations.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ReservationTest {
    private static final Instant NOW = Instant.parse("2026-09-04T20:00:00Z");
    private static final String FINGERPRINT = "a".repeat(64);

    @Test
    void createsBlockingHoldWithServerValues() {
        var reservation = hold(9000, 0);

        assertThat(reservation.status()).isEqualTo(ReservationStatus.HOLD);
        assertThat(reservation.status().blocksTime()).isTrue();
        assertThat(reservation.total()).isEqualTo(ReservationMoney.pen(9000));
        assertThat(reservation.expiresAt()).isEqualTo(NOW.plusSeconds(600));
    }

    @Test
    void rejectsDepositGreaterThanTotal() {
        assertThatThrownBy(() -> hold(5000, 6000))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("El adelanto no puede exceder el total");
    }

    @Test
    void confirmsUnpaidHoldOnlyBeforeExpiration() {
        var reservation = hold(9000, 0);

        reservation.confirmWithoutPayment(NOW.plusSeconds(30));

        assertThat(reservation.status()).isEqualTo(ReservationStatus.CONFIRMED);
        assertThat(reservation.expiresAt()).isNull();
    }

    @Test
    void completesOnlyConfirmedReservationAndIsIdempotent() {
        var reservation = hold(9000, 0);
        reservation.confirmWithoutPayment(NOW.plusSeconds(30));

        assertThat(reservation.complete(NOW.plusSeconds(60))).isTrue();
        assertThat(reservation.complete(NOW.plusSeconds(90))).isFalse();
        assertThat(reservation.status()).isEqualTo(ReservationStatus.COMPLETED);
        assertThat(reservation.status().blocksTime()).isFalse();
    }

    @Test
    void doesNotConfirmHoldThatRequiresDeposit() {
        var reservation = hold(9000, 3000);

        assertThatThrownBy(() -> reservation.confirmWithoutPayment(NOW.plusSeconds(30)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("La reserva requiere validar el adelanto");
    }

    @Test
    void expiresHoldAtBoundaryAndReleaseIsIdempotent() {
        var reservation = hold(9000, 0);

        assertThat(reservation.expire(NOW.plusSeconds(599))).isFalse();
        assertThat(reservation.expire(NOW.plusSeconds(600))).isTrue();
        assertThat(reservation.expire(NOW.plusSeconds(601))).isFalse();
        assertThat(reservation.status()).isEqualTo(ReservationStatus.EXPIRED);
        assertThat(reservation.status().blocksTime()).isFalse();
    }

    @Test
    void restoresAnExpiredTemporaryHoldSoItCanBeReleased() {
        var restored =
                Reservation.restore(
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        range(),
                        ReservationStatus.PENDING_PAYMENT,
                        ReservationMoney.pen(9000),
                        ReservationMoney.pen(2250),
                        NOW.minusSeconds(1),
                        new ReservationIdempotencyKey("expired-hold"),
                        FINGERPRINT,
                        NOW.minusSeconds(600),
                        NOW.minusSeconds(1),
                        2);

        assertThat(restored.expire(NOW)).isTrue();
        assertThat(restored.status()).isEqualTo(ReservationStatus.EXPIRED);
    }

    @Test
    void cancellationIsIdempotent() {
        var reservation = hold(9000, 0);

        assertThat(reservation.cancel(NOW.plusSeconds(30))).isTrue();
        assertThat(reservation.cancel(NOW.plusSeconds(40))).isFalse();
        assertThat(reservation.status()).isEqualTo(ReservationStatus.CANCELLED);
    }

    @Test
    void validatesRangeIdempotencyAndFingerprint() {
        assertThatThrownBy(() -> new ReservationTimeRange(NOW, NOW))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new ReservationIdempotencyKey(" "))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                        () ->
                                Reservation.hold(
                                        UUID.randomUUID(),
                                        UUID.randomUUID(),
                                        UUID.randomUUID(),
                                        range(),
                                        ReservationMoney.pen(9000),
                                        ReservationMoney.pen(0),
                                        NOW.plusSeconds(600),
                                        new ReservationIdempotencyKey("request-1"),
                                        "invalid",
                                        NOW))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("El fingerprint de la solicitud es inválido");
    }

    private Reservation hold(long totalMinor, long depositMinor) {
        return Reservation.hold(
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                range(),
                ReservationMoney.pen(totalMinor),
                ReservationMoney.pen(depositMinor),
                NOW.plusSeconds(600),
                new ReservationIdempotencyKey("request-1"),
                FINGERPRINT,
                NOW);
    }

    private ReservationTimeRange range() {
        return new ReservationTimeRange(NOW.plusSeconds(3600), NOW.plusSeconds(7200));
    }
}
