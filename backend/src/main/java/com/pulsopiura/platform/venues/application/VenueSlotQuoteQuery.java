package com.pulsopiura.platform.venues.application;

import java.time.Instant;
import java.util.UUID;

public interface VenueSlotQuoteQuery {
    SlotQuote requireBookableSlot(UUID sportSpaceId, Instant startsAt, Instant endsAt);

    record SlotQuote(
            UUID organizationId,
            UUID sportSpaceId,
            Instant startsAt,
            Instant endsAt,
            long priceMinor,
            String currency) {}
}
