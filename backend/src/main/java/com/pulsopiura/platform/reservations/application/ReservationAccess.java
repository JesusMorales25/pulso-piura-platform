package com.pulsopiura.platform.reservations.application;

import com.pulsopiura.platform.organizations.application.OrganizationAuthorization;
import com.pulsopiura.platform.organizations.domain.OrganizationPermission;
import com.pulsopiura.platform.reservations.domain.Reservation;
import java.util.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

@Component
class ReservationAccess {
    private final OrganizationAuthorization organizations;

    ReservationAccess(OrganizationAuthorization organizations) {
        this.organizations = organizations;
    }

    void requireRead(UUID actor, Reservation reservation) {
        require(actor, reservation, OrganizationPermission.VIEW);
    }

    void requireManage(UUID actor, Reservation reservation) {
        require(actor, reservation, OrganizationPermission.OPERATE);
    }

    void requireOwner(UUID actor, Reservation reservation) {
        if (organizations.require(
                        actor, reservation.organizationId(), OrganizationPermission.OPERATE)
                != com.pulsopiura.platform.organizations.domain.OrganizationRole.OWNER) {
            throw new AccessDeniedException("Solo el dueño puede cancelar reservas del complejo");
        }
    }

    private void require(UUID actor, Reservation reservation, OrganizationPermission permission) {
        if (reservation.customerUserId().equals(actor)) return;
        try {
            organizations.require(actor, reservation.organizationId(), permission);
        } catch (AccessDeniedException denied) {
            throw new NoSuchElementException("Reserva no encontrada");
        }
    }
}
