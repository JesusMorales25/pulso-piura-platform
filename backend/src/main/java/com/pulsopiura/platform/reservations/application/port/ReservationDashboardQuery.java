package com.pulsopiura.platform.reservations.application.port;

import com.pulsopiura.platform.reservations.application.ReservationDashboard;
import com.pulsopiura.platform.reservations.application.ReservationDashboard.Filter;
import com.pulsopiura.platform.reservations.application.ReservationQueryService.OrganizationReservationView;
import com.pulsopiura.platform.reservations.application.ReservationView;
import java.util.UUID;

public interface ReservationDashboardQuery {
    ReservationDashboard<ReservationView> own(UUID actor, Filter filter, int page, int size);

    ReservationDashboard<OrganizationReservationView> organization(
            UUID organization, Filter filter, int page, int size);
}
