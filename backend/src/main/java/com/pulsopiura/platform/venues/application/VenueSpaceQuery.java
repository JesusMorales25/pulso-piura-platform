package com.pulsopiura.platform.venues.application;

import java.util.UUID;

public interface VenueSpaceQuery {
    SpaceSnapshot requirePublishedSpace(UUID sportSpaceId);

    record SpaceSnapshot(
            UUID organizationId,
            UUID sportSpaceId,
            String sportCode,
            String formatCode,
            int capacity,
            String spaceName,
            String venueName,
            String venueAddress) {}
}
