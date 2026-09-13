package com.pulsopiura.platform.venues.application;

import com.pulsopiura.platform.organizations.application.OrganizationAuthorization;
import com.pulsopiura.platform.organizations.domain.OrganizationPermission;
import com.pulsopiura.platform.venues.infrastructure.persistence.*;
import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VenueService {
    private final VenueRepository venues;
    private final SportSpaceRepository spaces;
    private final OrganizationAuthorization authorization;
    private final VenueCatalogService catalogs;
    private final AmenityService amenities;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    @Autowired
    public VenueService(
            VenueRepository venues,
            SportSpaceRepository spaces,
            OrganizationAuthorization authorization,
            VenueCatalogService catalogs,
            AmenityService amenities,
            ApplicationEventPublisher events) {
        this(venues, spaces, authorization, catalogs, amenities, events, Clock.systemUTC());
    }

    VenueService(
            VenueRepository venues,
            SportSpaceRepository spaces,
            OrganizationAuthorization authorization,
            VenueCatalogService catalogs,
            AmenityService amenities,
            ApplicationEventPublisher events,
            Clock clock) {
        this.venues = venues;
        this.spaces = spaces;
        this.authorization = authorization;
        this.catalogs = catalogs;
        this.amenities = amenities;
        this.events = events;
        this.clock = clock;
    }

    @Transactional
    public VenueView createVenue(
            UUID actorId,
            UUID organizationId,
            String name,
            String address,
            String districtCode,
            BigDecimal latitude,
            BigDecimal longitude,
            String publicPhone,
            Collection<String> amenityCodes) {
        authorization.require(actorId, organizationId, OrganizationPermission.MANAGE_ORGANIZATION);
        var selectedAmenities = catalogs.requireVenueAmenities(amenityCodes);
        var entity =
                VenueEntity.create(
                        organizationId,
                        actorId,
                        name,
                        uniqueSlug(organizationId, name),
                        address,
                        districtCode,
                        latitude,
                        longitude,
                        publicPhone,
                        clock.instant());
        var saved = venues.save(entity);
        amenities.replaceVenueAmenities(organizationId, saved.id(), selectedAmenities);
        audit(actorId, organizationId, "VENUE_CREATED", "VENUE", saved.id());
        return view(saved);
    }

    @Transactional(readOnly = true)
    public List<VenueView> listVenues(UUID actorId, UUID organizationId) {
        authorization.require(actorId, organizationId, OrganizationPermission.VIEW);
        return venues.findAllByOrganizationIdOrderByNameAsc(organizationId).stream()
                .map(this::view)
                .toList();
    }

    @Transactional
    public VenueView updateVenue(
            UUID actorId,
            UUID organizationId,
            UUID venueId,
            String name,
            String address,
            String districtCode,
            BigDecimal latitude,
            BigDecimal longitude,
            String publicPhone,
            Collection<String> amenityCodes,
            long version) {
        authorization.require(actorId, organizationId, OrganizationPermission.MANAGE_ORGANIZATION);
        var selectedAmenities = catalogs.requireVenueAmenities(amenityCodes);
        var venue = requireVenue(organizationId, venueId);
        venue.update(
                name,
                address,
                districtCode,
                latitude,
                longitude,
                publicPhone,
                version,
                clock.instant());
        var saved = venues.saveAndFlush(venue);
        amenities.replaceVenueAmenities(organizationId, saved.id(), selectedAmenities);
        audit(actorId, organizationId, "VENUE_UPDATED", "VENUE", saved.id());
        return view(saved);
    }

    @Transactional
    public VenueView publish(UUID actorId, UUID organizationId, UUID venueId) {
        authorization.require(actorId, organizationId, OrganizationPermission.MANAGE_ORGANIZATION);
        var venue = requireVenue(organizationId, venueId);
        venue.publish(clock.instant());
        var saved = venues.saveAndFlush(venue);
        audit(actorId, organizationId, "VENUE_PUBLISHED", "VENUE", saved.id());
        return view(saved);
    }

    @Transactional
    public void archive(UUID actorId, UUID organizationId, UUID venueId) {
        authorization.require(actorId, organizationId, OrganizationPermission.MANAGE_ORGANIZATION);
        requireVenue(organizationId, venueId).archive(clock.instant());
        audit(actorId, organizationId, "VENUE_ARCHIVED", "VENUE", venueId);
    }

    @Transactional
    public SportSpaceView createSpace(
            UUID actorId,
            UUID organizationId,
            UUID venueId,
            String name,
            String sportCode,
            String formatCode,
            int capacity,
            String surfaceType,
            boolean indoor,
            Collection<String> amenityCodes) {
        authorization.require(actorId, organizationId, OrganizationPermission.MANAGE_ORGANIZATION);
        var venue = requireVenue(organizationId, venueId);
        venue.requireConfigurable();
        var selection =
                catalogs.requireSpaceSelection(sportCode, formatCode, surfaceType, amenityCodes);
        var entity =
                SportSpaceEntity.create(
                        organizationId,
                        venueId,
                        actorId,
                        name,
                        selection.sportCode(),
                        selection.formatCode(),
                        capacity,
                        selection.surfaceCode(),
                        indoor,
                        clock.instant());
        var saved = spaces.save(entity);
        amenities.replaceSpaceAmenities(organizationId, saved.id(), selection.amenityCodes());
        audit(actorId, organizationId, "SPORT_SPACE_CREATED", "SPORT_SPACE", saved.id());
        return view(saved);
    }

    @Transactional(readOnly = true)
    public List<SportSpaceView> listSpaces(UUID actorId, UUID organizationId, UUID venueId) {
        authorization.require(actorId, organizationId, OrganizationPermission.VIEW);
        requireVenue(organizationId, venueId);
        return spaces
                .findAllByOrganizationIdAndVenueIdOrderByNameAsc(organizationId, venueId)
                .stream()
                .map(this::view)
                .toList();
    }

    @Transactional
    public SportSpaceView updateSpace(
            UUID actorId,
            UUID organizationId,
            UUID spaceId,
            String name,
            String sportCode,
            String formatCode,
            int capacity,
            String surfaceType,
            boolean indoor,
            Collection<String> amenityCodes,
            long version) {
        authorization.require(actorId, organizationId, OrganizationPermission.MANAGE_ORGANIZATION);
        var space = requireSpace(organizationId, spaceId);
        requireVenue(organizationId, space.venueId()).requireConfigurable();
        var selection =
                catalogs.requireSpaceSelection(sportCode, formatCode, surfaceType, amenityCodes);
        space.update(
                name,
                selection.sportCode(),
                selection.formatCode(),
                capacity,
                selection.surfaceCode(),
                indoor,
                version,
                clock.instant());
        var saved = spaces.saveAndFlush(space);
        amenities.replaceSpaceAmenities(organizationId, saved.id(), selection.amenityCodes());
        audit(actorId, organizationId, "SPORT_SPACE_UPDATED", "SPORT_SPACE", saved.id());
        return view(saved);
    }

    @Transactional
    public SportSpaceView publishSpace(UUID actorId, UUID organizationId, UUID spaceId) {
        authorization.require(actorId, organizationId, OrganizationPermission.MANAGE_ORGANIZATION);
        var space = requireSpace(organizationId, spaceId);
        requireVenue(organizationId, space.venueId()).requirePublished();
        space.publish(clock.instant());
        var saved = spaces.saveAndFlush(space);
        audit(actorId, organizationId, "SPORT_SPACE_PUBLISHED", "SPORT_SPACE", saved.id());
        return view(saved);
    }

    @Transactional
    public void archiveSpace(UUID actorId, UUID organizationId, UUID spaceId) {
        authorization.require(actorId, organizationId, OrganizationPermission.MANAGE_ORGANIZATION);
        requireSpace(organizationId, spaceId).archive(clock.instant());
        audit(actorId, organizationId, "SPORT_SPACE_ARCHIVED", "SPORT_SPACE", spaceId);
    }

    private VenueEntity requireVenue(UUID organizationId, UUID venueId) {
        return venues.findByIdAndOrganizationId(venueId, organizationId)
                .orElseThrow(() -> new NoSuchElementException("Sede no encontrada"));
    }

    private SportSpaceEntity requireSpace(UUID organizationId, UUID spaceId) {
        return spaces.findByIdAndOrganizationId(spaceId, organizationId)
                .orElseThrow(() -> new NoSuchElementException("Cancha no encontrada"));
    }

    private String uniqueSlug(UUID organizationId, String name) {
        if (name == null || name.isBlank())
            throw new IllegalArgumentException("El nombre es obligatorio");
        var base =
                Normalizer.normalize(name, Normalizer.Form.NFD)
                        .replaceAll("\\p{M}", "")
                        .toLowerCase(Locale.ROOT)
                        .replaceAll("[^a-z0-9]+", "-")
                        .replaceAll("(^-|-$)", "");
        if (base.isBlank()) base = "sede";
        var candidate = base;
        for (int suffix = 2;
                venues.existsByOrganizationIdAndSlug(organizationId, candidate);
                suffix++) {
            candidate = base + "-" + suffix;
        }
        return candidate;
    }

    private VenueView view(VenueEntity venue) {
        return new VenueView(
                venue.id(),
                venue.organizationId(),
                venue.name(),
                venue.slug(),
                venue.publicSlug(),
                venue.address(),
                venue.districtCode(),
                venue.latitude(),
                venue.longitude(),
                venue.publicPhone(),
                amenities.venueAmenities(venue.organizationId(), venue.id()),
                venue.status().name(),
                venue.version());
    }

    private SportSpaceView view(SportSpaceEntity space) {
        return new SportSpaceView(
                space.id(),
                space.organizationId(),
                space.venueId(),
                space.name(),
                space.sportCode().name(),
                space.formatCode(),
                space.capacity(),
                space.surfaceType(),
                space.indoor(),
                amenities.spaceAmenities(space.organizationId(), space.id()),
                space.status().name(),
                space.version());
    }

    private void audit(
            UUID actorId,
            UUID organizationId,
            String action,
            String resourceType,
            UUID resourceId) {
        events.publishEvent(
                new VenueAuditEvent(actorId, organizationId, action, resourceType, resourceId));
    }
}
