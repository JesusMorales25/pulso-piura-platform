package com.pulsopiura.platform.venues.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.pulsopiura.platform.venues.infrastructure.persistence.AmenityCatalogEntity;
import com.pulsopiura.platform.venues.infrastructure.persistence.AmenityCatalogRepository;
import com.pulsopiura.platform.venues.infrastructure.persistence.SportCatalogRepository;
import com.pulsopiura.platform.venues.infrastructure.persistence.SportFormatCatalogRepository;
import com.pulsopiura.platform.venues.infrastructure.persistence.SurfaceTypeCatalogRepository;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class VenueCatalogServiceTest {
    private final SportCatalogRepository sports = mock(SportCatalogRepository.class);
    private final SportFormatCatalogRepository formats = mock(SportFormatCatalogRepository.class);
    private final SurfaceTypeCatalogRepository surfaces = mock(SurfaceTypeCatalogRepository.class);
    private final AmenityCatalogRepository amenities = mock(AmenityCatalogRepository.class);
    private VenueCatalogService service;

    @BeforeEach
    void setUp() {
        service = new VenueCatalogService(sports, formats, surfaces, amenities);
    }

    @Test
    void acceptsAndNormalizesAValidSpaceSelection() {
        when(sports.existsByCodeAndActiveTrue("FOOTBALL")).thenReturn(true);
        when(formats.existsByCodeAndSportCodeAndActiveTrue("FOOTBALL_7", "FOOTBALL"))
                .thenReturn(true);
        when(surfaces.existsByCodeAndActiveTrue("SYNTHETIC_GRASS")).thenReturn(true);
        var lighting = mock(AmenityCatalogEntity.class);
        when(lighting.scope()).thenReturn("SPORT_SPACE");
        when(amenities.findAllByCodeInAndActiveTrue(Set.of("LED_LIGHTING")))
                .thenReturn(List.of(lighting));

        var selection =
                service.requireSpaceSelection(
                        " football ", "football_7", "synthetic_grass", Set.of("led_lighting"));

        assertThat(selection.sportCode()).isEqualTo("FOOTBALL");
        assertThat(selection.formatCode()).isEqualTo("FOOTBALL_7");
        assertThat(selection.surfaceCode()).isEqualTo("SYNTHETIC_GRASS");
        assertThat(selection.amenityCodes()).containsExactly("LED_LIGHTING");
    }

    @Test
    void rejectsAFormatThatDoesNotBelongToTheSelectedSport() {
        when(sports.existsByCodeAndActiveTrue("FOOTBALL")).thenReturn(true);

        assertThatThrownBy(
                        () ->
                                service.requireSpaceSelection(
                                        "FOOTBALL", "TENNIS_SINGLES", null, Set.of()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("modalidad");
    }

    @Test
    void rejectsAnAmenityAssignedToTheWrongResourceType() {
        var parking = mock(AmenityCatalogEntity.class);
        when(parking.scope()).thenReturn("VENUE");
        when(amenities.findAllByCodeInAndActiveTrue(Set.of("PARKING")))
                .thenReturn(List.of(parking));

        when(sports.existsByCodeAndActiveTrue("FOOTBALL")).thenReturn(true);
        when(formats.existsByCodeAndSportCodeAndActiveTrue("FOOTBALL_7", "FOOTBALL"))
                .thenReturn(true);

        assertThatThrownBy(
                        () ->
                                service.requireSpaceSelection(
                                        "FOOTBALL", "FOOTBALL_7", null, Set.of("PARKING")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("tipo de recurso");
    }
}
