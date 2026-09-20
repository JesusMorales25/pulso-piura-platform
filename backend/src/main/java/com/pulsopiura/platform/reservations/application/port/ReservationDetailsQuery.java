package com.pulsopiura.platform.reservations.application.port;

import java.util.UUID;

public interface ReservationDetailsQuery {
    Names names(UUID reservationId);

    Summary summary(UUID organizationId);

    record Names(
            String venueName,
            String spaceName,
            int spaceCapacity,
            boolean matchAssociated) {}

    record Summary(
            long total,
            long confirmed,
            long pending,
            long cancelled,
            long paidMinor,
            long balanceMinor,
            long retainedMinor) {}
}
