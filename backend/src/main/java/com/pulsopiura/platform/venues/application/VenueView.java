package com.pulsopiura.platform.venues.application;

import java.math.BigDecimal;
import java.util.Set;
import java.util.UUID;

public record VenueView(
        UUID id,
        UUID organizationId,
        String name,
        String slug,
        String publicSlug,
        String address,
        String districtCode,
        BigDecimal latitude,
        BigDecimal longitude,
        String publicPhone,
        Set<String> amenityCodes,
        String status,
        long version) {}
