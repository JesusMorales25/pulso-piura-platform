package com.pulsopiura.platform.reservations.application;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

import com.pulsopiura.platform.organizations.application.OrganizationAuthorization;
import com.pulsopiura.platform.organizations.domain.OrganizationPermission;
import com.pulsopiura.platform.reservations.domain.*;
import java.time.Instant;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

class ReservationAccessTest {
    private static final Instant NOW = Instant.parse("2026-09-05T15:00:00Z");

    @Test
    void ownerReadsAndManagesWithoutOrganizationMembership() {
        var organizations = mock(OrganizationAuthorization.class);
        var access = new ReservationAccess(organizations);
        var actor = UUID.randomUUID();
        var reservation = hold(actor);

        access.requireRead(actor, reservation);
        access.requireManage(actor, reservation);

        verifyNoInteractions(organizations);
    }

    @Test
    void hidesReservationWhenOrganizationAuthorizationFails() {
        var organizations = mock(OrganizationAuthorization.class);
        var access = new ReservationAccess(organizations);
        var reservation = hold(UUID.randomUUID());
        var outsider = UUID.randomUUID();
        doThrow(new AccessDeniedException("otro tenant"))
                .when(organizations)
                .require(outsider, reservation.organizationId(), OrganizationPermission.VIEW);

        assertThatThrownBy(() -> access.requireRead(outsider, reservation))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessage("Reserva no encontrada");
    }

    private Reservation hold(UUID customer) {
        var space = UUID.randomUUID();
        var startsAt = NOW.plusSeconds(3600);
        var endsAt = NOW.plusSeconds(7200);
        return Reservation.hold(
                UUID.randomUUID(),
                space,
                customer,
                new ReservationTimeRange(startsAt, endsAt),
                ReservationMoney.pen(9000),
                ReservationMoney.pen(0),
                NOW.plusSeconds(600),
                new ReservationIdempotencyKey(UUID.randomUUID().toString()),
                ReservationRequestFingerprint.calculate(space, startsAt, endsAt),
                NOW);
    }
}
