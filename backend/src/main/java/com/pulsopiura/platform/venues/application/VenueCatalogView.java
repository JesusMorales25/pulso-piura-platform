package com.pulsopiura.platform.venues.application;

import java.util.List;

public record VenueCatalogView(
        List<CatalogItem> sports,
        List<SportFormatItem> formats,
        List<CatalogItem> surfaces,
        List<AmenityItem> amenities) {
    public record CatalogItem(String code, String name) {}

    public record SportFormatItem(
            String code, String sportCode, String name, Integer recommendedCapacity) {}

    public record AmenityItem(String code, String name, String scope) {}
}
