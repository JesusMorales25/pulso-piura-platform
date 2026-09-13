package com.pulsopiura.platform.venues.application;

import java.time.*;
import java.util.UUID;

public record AvailabilityRuleView(
        UUID id,
        UUID sportSpaceId,
        int dayOfWeek,
        LocalTime startLocalTime,
        LocalTime endLocalTime,
        int slotMinutes,
        long priceMinor,
        String currency,
        LocalDate validFrom,
        LocalDate validTo,
        String status,
        long version) {}
