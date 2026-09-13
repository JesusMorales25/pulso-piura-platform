package com.pulsopiura.platform.venues.application;

import java.time.LocalDate;
import java.util.UUID;

public interface VenueAvailabilityQuery {
    PublicVenueViews.Availability availability(UUID spaceId, LocalDate date);
}
