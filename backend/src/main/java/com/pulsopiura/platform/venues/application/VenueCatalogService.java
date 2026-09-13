package com.pulsopiura.platform.venues.application;

import com.pulsopiura.platform.venues.infrastructure.persistence.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VenueCatalogService {
    private final SportCatalogRepository sports;
    private final SportFormatCatalogRepository formats;
    private final SurfaceTypeCatalogRepository surfaces;
    private final AmenityCatalogRepository amenities;

    public VenueCatalogService(
            SportCatalogRepository sports,
            SportFormatCatalogRepository formats,
            SurfaceTypeCatalogRepository surfaces,
            AmenityCatalogRepository amenities) {
        this.sports = sports;
        this.formats = formats;
        this.surfaces = surfaces;
        this.amenities = amenities;
    }

    @Transactional(readOnly = true)
    public VenueCatalogView getActiveCatalogs() {
        return new VenueCatalogView(
                sports.findAllByActiveTrueOrderByNameAsc().stream()
                        .map(item -> new VenueCatalogView.CatalogItem(item.code(), item.name()))
                        .toList(),
                formats.findAllByActiveTrueOrderBySportCodeAscNameAsc().stream()
                        .map(
                                item ->
                                        new VenueCatalogView.SportFormatItem(
                                                item.code(),
                                                item.sportCode(),
                                                item.name(),
                                                item.recommendedCapacity()))
                        .toList(),
                surfaces.findAllByActiveTrueOrderByNameAsc().stream()
                        .map(item -> new VenueCatalogView.CatalogItem(item.code(), item.name()))
                        .toList(),
                amenities.findAllByActiveTrueOrderByNameAsc().stream()
                        .map(
                                item ->
                                        new VenueCatalogView.AmenityItem(
                                                item.code(), item.name(), item.scope()))
                        .toList());
    }

    @Transactional(readOnly = true)
    public SpaceCatalogSelection requireSpaceSelection(
            String rawSportCode,
            String rawFormatCode,
            String rawSurfaceCode,
            Collection<String> rawAmenityCodes) {
        var sportCode = normalizeRequired(rawSportCode, "El deporte");
        var formatCode = normalizeRequired(rawFormatCode, "La modalidad");
        var surfaceCode = normalizeOptional(rawSurfaceCode);
        if (!sports.existsByCodeAndActiveTrue(sportCode)) {
            throw new IllegalArgumentException("Deporte no admitido");
        }
        if (!formats.existsByCodeAndSportCodeAndActiveTrue(formatCode, sportCode)) {
            throw new IllegalArgumentException("La modalidad no corresponde al deporte");
        }
        if (surfaceCode != null && !surfaces.existsByCodeAndActiveTrue(surfaceCode)) {
            throw new IllegalArgumentException("Superficie no admitida");
        }
        return new SpaceCatalogSelection(
                sportCode,
                formatCode,
                surfaceCode,
                requireAmenities(rawAmenityCodes, "SPORT_SPACE"));
    }

    @Transactional(readOnly = true)
    public Set<String> requireVenueAmenities(Collection<String> rawCodes) {
        return requireAmenities(rawCodes, "VENUE");
    }

    private Set<String> requireAmenities(Collection<String> rawCodes, String targetScope) {
        var codes = normalizeCodes(rawCodes);
        if (codes.isEmpty()) return codes;
        var found = amenities.findAllByCodeInAndActiveTrue(codes);
        if (found.size() != codes.size()) {
            throw new IllegalArgumentException("Una o más amenidades no existen o están inactivas");
        }
        var invalidScope =
                found.stream()
                        .anyMatch(
                                item ->
                                        !"BOTH".equals(item.scope())
                                                && !targetScope.equals(item.scope()));
        if (invalidScope) {
            throw new IllegalArgumentException("Una amenidad no corresponde al tipo de recurso");
        }
        return codes;
    }

    private Set<String> normalizeCodes(Collection<String> rawCodes) {
        if (rawCodes == null) return Set.of();
        var normalized = new TreeSet<String>();
        for (var code : rawCodes) {
            normalized.add(normalizeRequired(code, "El código de amenidad"));
        }
        return Collections.unmodifiableSet(normalized);
    }

    private String normalizeRequired(String value, String label) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(label + " es obligatorio");
        }
        return value.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim().toUpperCase(Locale.ROOT);
    }

    public record SpaceCatalogSelection(
            String sportCode, String formatCode, String surfaceCode, Set<String> amenityCodes) {}
}
