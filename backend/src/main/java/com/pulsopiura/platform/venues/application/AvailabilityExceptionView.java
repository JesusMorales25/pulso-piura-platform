package com.pulsopiura.platform.venues.application;

import java.time.Instant;
import java.util.UUID;

public record AvailabilityExceptionView(
        UUID id,
        UUID sportSpaceId,
        Instant startsAt,
        Instant endsAt,
        String type,
        Long priceMinor,
        String currency,
        String reason,
        String status,
        long version) {}
