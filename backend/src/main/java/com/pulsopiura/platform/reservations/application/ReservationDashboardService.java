package com.pulsopiura.platform.reservations.application;

import com.pulsopiura.platform.organizations.application.OrganizationAuthorization;
import com.pulsopiura.platform.organizations.domain.OrganizationPermission;
import com.pulsopiura.platform.organizations.domain.OrganizationRole;
import com.pulsopiura.platform.reservations.application.ReservationDashboard.Filter;
import com.pulsopiura.platform.reservations.application.ReservationQueryService.OrganizationReservationView;
import com.pulsopiura.platform.reservations.application.port.ReservationDashboardQuery;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class ReservationDashboardService {
    private final ReservationDashboardQuery query;
    private final OrganizationAuthorization organizations;

    public ReservationDashboardService(
            ReservationDashboardQuery query, OrganizationAuthorization organizations) {
        this.query = query;
        this.organizations = organizations;
    }

    public ReservationDashboard<ReservationView> own(
            UUID actor, Filter filter, int page, int size) {
        validate(page, size);
        return query.own(actor, filter, page, size);
    }

    public ReservationDashboard<OrganizationReservationView> organization(
            UUID actor, UUID organization, Filter filter, int page, int size) {
        validate(page, size);
        if (organizations.require(actor, organization, OrganizationPermission.VIEW)
                != OrganizationRole.OWNER)
            throw new AccessDeniedException("Solo el dueño puede ver el dashboard de reservas");
        return query.organization(organization, filter, page, size);
    }

    private void validate(int page, int size) {
        if (page < 0 || size < 1 || size > 50)
            throw new IllegalArgumentException("Paginación inválida");
    }
}
