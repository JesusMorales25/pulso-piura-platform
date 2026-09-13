package com.pulsopiura.platform.venues.application;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public final class PublicVenueViews {
    private PublicVenueViews() {}

    public record VenuePage(List<Venue> items, int page, int size, long total) {}

    public record Venue(
            String publicSlug,
            String name,
            String address,
            String districtCode,
            BigDecimal latitude,
            BigDecimal longitude,
            String publicPhone,
            Set<String> amenityCodes) {}

    public record Space(
            UUID id,
            String name,
            String sportCode,
            String formatCode,
            int capacity,
            String surfaceType,
            boolean indoor,
            Set<String> amenityCodes) {}

    public record Availability(UUID sportSpaceId, String timezone, String date, List<Slot> slots) {}

    public record Slot(Instant startsAt, Instant endsAt, long priceMinor, String currency) {}
}
