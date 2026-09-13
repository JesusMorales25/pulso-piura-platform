package com.pulsopiura.platform.reservations.application;

import com.pulsopiura.platform.organizations.application.OrganizationAuthorization;
import com.pulsopiura.platform.organizations.domain.OrganizationPermission;
import com.pulsopiura.platform.organizations.domain.OrganizationRole;
import com.pulsopiura.platform.reservations.application.port.ReservationStore;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReservationQueryService {
    private final ReservationStore reservations;
    private final ReservationAccess access;
    private final com.pulsopiura.platform.reservations.application.port.ReservationDetailsQuery
            details;
    private final com.pulsopiura.platform.reservations.application.port.ReservationPaymentQuery
            payments;
    private final OrganizationAuthorization organizations;

    public ReservationQueryService(
            ReservationStore reservations,
            ReservationAccess access,
            OrganizationAuthorization organizations,
            com.pulsopiura.platform.reservations.application.port.ReservationPaymentQuery payments,
            com.pulsopiura.platform.reservations.application.port.ReservationDetailsQuery details) {
        this.reservations = reservations;
        this.access = access;
        this.organizations = organizations;
        this.payments = payments;
        this.details = details;
    }

    @Transactional(readOnly = true)
    public ReservationView get(UUID actor, UUID id) {
        var value =
                reservations
                        .findById(id)
                        .orElseThrow(() -> new NoSuchElementException("Reserva no encontrada"));
        access.requireRead(actor, value);
        return ReservationView.from(value)
                .withPayment(payments.paidMinor(value.id()))
                .withNames(details.names(value.id()));
    }

    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.MANDATORY)
    public ReservationView lockCustomer(UUID actor, UUID id) {
        var value =
                reservations
                        .findByIdForUpdate(id)
                        .orElseThrow(() -> new NoSuchElementException("Reserva no encontrada"));
        if (!value.customerUserId().equals(actor))
            throw new org.springframework.security.access.AccessDeniedException(
                    "Solo el cliente puede pagar esta reserva");
        return ReservationView.from(value);
    }

    @Transactional(readOnly = true)
    public ReservationView requireCustomer(UUID actor, UUID id) {
        var value =
                reservations
                        .findById(id)
                        .orElseThrow(() -> new NoSuchElementException("Reserva no encontrada"));
        if (!value.customerUserId().equals(actor))
            throw new org.springframework.security.access.AccessDeniedException(
                    "Solo el cliente puede pagar esta reserva");
        return ReservationView.from(value);
    }

    @Transactional(readOnly = true)
    public ReservationPage listOwn(UUID actor, int page, int size) {
        if (page < 0 || size < 1 || size > 50)
            throw new IllegalArgumentException("Paginación inválida");
        return new ReservationPage(
                reservations.findByCustomer(actor, page, size).stream()
                        .map(
                                value ->
                                        ReservationView.from(value)
                                                .withPayment(payments.paidMinor(value.id()))
                                                .withNames(details.names(value.id())))
                        .toList(),
                page,
                size,
                reservations.countByCustomer(actor));
    }

    @Transactional(readOnly = true)
    public OrganizationReservationPage listForOrganization(
            UUID actor, UUID organizationId, int page, int size) {
        if (page < 0 || size < 1 || size > 100)
            throw new IllegalArgumentException("Paginación inválida");
        if (organizations.require(actor, organizationId, OrganizationPermission.VIEW)
                != OrganizationRole.OWNER)
            throw new org.springframework.security.access.AccessDeniedException(
                    "Solo el dueño puede ver el dashboard de reservas");
        return new OrganizationReservationPage(
                reservations.findByOrganization(organizationId, page, size).stream()
                        .map(
                                row ->
                                        OrganizationReservationView.from(
                                                row, payments.paidMinor(row.id())))
                        .toList(),
                page,
                size,
                reservations.countByOrganization(organizationId));
    }

    @Transactional(readOnly = true)
    public com.pulsopiura.platform.reservations.application.port.ReservationDetailsQuery.Summary
            summary(UUID actor, UUID organizationId) {
        if (organizations.require(actor, organizationId, OrganizationPermission.VIEW)
                != OrganizationRole.OWNER)
            throw new org.springframework.security.access.AccessDeniedException(
                    "Solo el dueño puede ver el dashboard");
        return details.summary(organizationId);
    }

    public record ReservationPage(List<ReservationView> items, int page, int size, long total) {}

    public record OrganizationReservationPage(
            List<OrganizationReservationView> items, int page, int size, long total) {}

    public record OrganizationReservationView(
            UUID id,
            UUID sportSpaceId,
            String spaceName,
            String venueName,
            UUID customerUserId,
            String customerEmail,
            java.time.Instant startsAt,
            java.time.Instant endsAt,
            String status,
            long totalMinor,
            long depositMinor,
            String currency,
            java.time.Instant expiresAt,
            long paidMinor) {
        static OrganizationReservationView from(
                ReservationStore.OrganizationReservationRow row, long paid) {
            return new OrganizationReservationView(
                    row.id(),
                    row.sportSpaceId(),
                    row.spaceName(),
                    row.venueName(),
                    row.customerUserId(),
                    row.customerEmail(),
                    row.startsAt(),
                    row.endsAt(),
                    row.status(),
                    row.totalMinor(),
                    row.depositMinor(),
                    row.currency(),
                    row.expiresAt(),
                    paid);
        }
    }
}
