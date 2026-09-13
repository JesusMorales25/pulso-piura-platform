package com.pulsopiura.platform.venues.application;

import com.pulsopiura.platform.organizations.application.OrganizationSettingsQuery;
import com.pulsopiura.platform.venues.domain.AvailabilityExceptionType;
import com.pulsopiura.platform.venues.domain.VenueStatus;
import com.pulsopiura.platform.venues.infrastructure.persistence.*;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PublicVenueQueryService
        implements VenueSlotQuoteQuery, VenueAvailabilityQuery, VenueSpaceQuery {
    private final VenueRepository venues;
    private final SportSpaceRepository spaces;
    private final AvailabilityRuleRepository rules;
    private final AvailabilityExceptionRepository exceptions;
    private final AmenityService amenities;
    private final OrganizationSettingsQuery organizationSettings;

    public PublicVenueQueryService(
            VenueRepository venues,
            SportSpaceRepository spaces,
            AvailabilityRuleRepository rules,
            AvailabilityExceptionRepository exceptions,
            AmenityService amenities,
            OrganizationSettingsQuery organizationSettings) {
        this.venues = venues;
        this.spaces = spaces;
        this.rules = rules;
        this.exceptions = exceptions;
        this.amenities = amenities;
        this.organizationSettings = organizationSettings;
    }

    @Transactional(readOnly = true)
    public PublicVenueViews.VenuePage search(
            String district, String sportCode, LocalDate date, int page, int size) {
        if (page < 0) throw new IllegalArgumentException("La página no puede ser negativa");
        if (size < 1 || size > 50)
            throw new IllegalArgumentException("El tamaño debe estar entre 1 y 50");
        var normalizedDistrict = normalize(district);
        var normalizedSport = normalize(sportCode);
        var filtered =
                venues.findAllByStatusOrderByNameAsc(VenueStatus.PUBLISHED).stream()
                        .filter(
                                venue ->
                                        normalizedDistrict == null
                                                || venue.districtCode()
                                                        .toUpperCase(Locale.ROOT)
                                                        .contains(normalizedDistrict))
                        .filter(venue -> matchesSpaceFilter(venue, normalizedSport, date))
                        .toList();
        var offset = (long) page * size;
        var from = (int) Math.min(offset, filtered.size());
        var to = Math.min(from + size, filtered.size());
        return new PublicVenueViews.VenuePage(
                filtered.subList(from, to).stream().map(this::venueView).toList(),
                page,
                size,
                filtered.size());
    }

    @Transactional(readOnly = true)
    public PublicVenueViews.Venue getVenue(String publicSlug) {
        return venueView(requirePublishedVenue(publicSlug));
    }

    @Transactional(readOnly = true)
    public List<PublicVenueViews.Space> listSpaces(String publicSlug) {
        var venue = requirePublishedVenue(publicSlug);
        return publishedSpaces(venue).stream().map(this::spaceView).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PublicVenueViews.Availability availability(UUID spaceId, LocalDate date) {
        if (date == null) throw new IllegalArgumentException("La fecha es obligatoria");
        var space = requirePublishedSpaceEntity(spaceId);
        var timezone = organizationSettings.requireActiveTimezone(space.organizationId());
        var slots = availableSlots(space, date, timezone);
        return new PublicVenueViews.Availability(
                space.id(), timezone.getId(), date.toString(), slots);
    }

    @Override
    @Transactional(readOnly = true)
    public SlotQuote requireBookableSlot(UUID spaceId, Instant startsAt, Instant endsAt) {
        if (startsAt == null || endsAt == null || !startsAt.isBefore(endsAt)) {
            throw new IllegalArgumentException("El rango solicitado es inválido");
        }
        var space = requirePublishedSpaceEntity(spaceId);
        var timezone = organizationSettings.requireActiveTimezone(space.organizationId());
        var date = startsAt.atZone(timezone).toLocalDate();
        var selectedSlots =
                availableSlots(space, date, timezone).stream()
                        .filter(
                                slot ->
                                        !slot.startsAt().isBefore(startsAt)
                                                && !slot.endsAt().isAfter(endsAt))
                        .sorted(Comparator.comparing(PublicVenueViews.Slot::startsAt))
                        .toList();
        var completeRange =
                !selectedSlots.isEmpty()
                        && selectedSlots.getFirst().startsAt().equals(startsAt)
                        && selectedSlots.getLast().endsAt().equals(endsAt)
                        && java.util.stream.IntStream.range(1, selectedSlots.size())
                                .allMatch(
                                        index ->
                                                selectedSlots
                                                        .get(index - 1)
                                                        .endsAt()
                                                        .equals(
                                                                selectedSlots
                                                                        .get(index)
                                                                        .startsAt()));
        var sameCurrency =
                completeRange
                        && selectedSlots.stream()
                                        .map(PublicVenueViews.Slot::currency)
                                        .distinct()
                                        .count()
                                == 1;
        if (!sameCurrency) {
            throw new SlotNotBookableException("La franja solicitada no está disponible");
        }
        var totalPrice =
                selectedSlots.stream()
                        .mapToLong(PublicVenueViews.Slot::priceMinor)
                        .reduce(0, Math::addExact);
        return new SlotQuote(
                space.organizationId(),
                space.id(),
                startsAt,
                endsAt,
                totalPrice,
                selectedSlots.getFirst().currency());
    }

    @Override
    @Transactional(readOnly = true)
    public SpaceSnapshot requirePublishedSpace(UUID spaceId) {
        var space = requirePublishedSpaceEntity(spaceId);
        var venue =
                venues.findByIdAndOrganizationId(space.venueId(), space.organizationId())
                        .filter(item -> item.status() == VenueStatus.PUBLISHED)
                        .orElseThrow(() -> new NoSuchElementException("Cancha no encontrada"));
        return new SpaceSnapshot(
                space.organizationId(),
                space.id(),
                space.sportCode().name(),
                space.formatCode(),
                space.capacity(),
                space.name(),
                venue.name(),
                venue.address());
    }

    private List<PublicVenueViews.Slot> availableSlots(
            SportSpaceEntity space, LocalDate date, ZoneId timezone) {
        var activeExceptions =
                exceptions
                        .findAllByOrganizationIdAndSportSpaceIdOrderByStartsAtAsc(
                                space.organizationId(), space.id())
                        .stream()
                        .filter(item -> "ACTIVE".equals(item.status()))
                        .toList();
        return rules
                .findAllByOrganizationIdAndSportSpaceIdOrderByDayOfWeekAscStartLocalTimeAsc(
                        space.organizationId(), space.id())
                .stream()
                .filter(rule -> applies(rule, date))
                .flatMap(rule -> slotsFor(rule, date, timezone, activeExceptions).stream())
                .sorted(Comparator.comparing(PublicVenueViews.Slot::startsAt))
                .toList();
    }

    private boolean matchesSpaceFilter(VenueEntity venue, String sportCode, LocalDate date) {
        if (sportCode == null && date == null) return true;
        return publishedSpaces(venue).stream()
                .filter(space -> sportCode == null || space.sportCode().name().equals(sportCode))
                .anyMatch(space -> date == null || hasAvailableSlot(space, date));
    }

    private boolean hasAvailableSlot(SportSpaceEntity space, LocalDate date) {
        var timezone = organizationSettings.requireActiveTimezone(space.organizationId());
        return !availableSlots(space, date, timezone).isEmpty();
    }

    private List<PublicVenueViews.Slot> slotsFor(
            AvailabilityRuleEntity rule,
            LocalDate date,
            ZoneId timezone,
            List<AvailabilityExceptionEntity> activeExceptions) {
        var result = new ArrayList<PublicVenueViews.Slot>();
        var boundary = LocalDateTime.of(date, rule.endLocalTime());
        for (var start = LocalDateTime.of(date, rule.startLocalTime());
                !start.plusMinutes(rule.slotMinutes()).isAfter(boundary);
                start = start.plusMinutes(rule.slotMinutes())) {
            var startsAt = start.atZone(timezone).toInstant();
            var endsAt = start.plusMinutes(rule.slotMinutes()).atZone(timezone).toInstant();
            var overlapping =
                    activeExceptions.stream()
                            .filter(
                                    item ->
                                            item.startsAt().isBefore(endsAt)
                                                    && item.endsAt().isAfter(startsAt))
                            .toList();
            if (overlapping.stream()
                    .anyMatch(
                            item ->
                                    item.type() == AvailabilityExceptionType.CLOSED
                                            || item.type()
                                                    == AvailabilityExceptionType.MAINTENANCE))
                continue;
            var price =
                    overlapping.stream()
                            .filter(item -> item.type() == AvailabilityExceptionType.SPECIAL_PRICE)
                            .map(AvailabilityExceptionEntity::priceMinor)
                            .filter(Objects::nonNull)
                            .reduce((first, second) -> second)
                            .orElse(rule.priceMinor());
            result.add(new PublicVenueViews.Slot(startsAt, endsAt, price, rule.currency()));
        }
        return result;
    }

    private boolean applies(AvailabilityRuleEntity rule, LocalDate date) {
        return "ACTIVE".equals(rule.status())
                && rule.dayOfWeek() == date.getDayOfWeek().getValue()
                && !date.isBefore(rule.validFrom())
                && (rule.validTo() == null || !date.isAfter(rule.validTo()));
    }

    private VenueEntity requirePublishedVenue(String publicSlug) {
        return venues.findByPublicSlugAndStatus(publicSlug, VenueStatus.PUBLISHED)
                .orElseThrow(() -> new NoSuchElementException("Sede no encontrada"));
    }

    private SportSpaceEntity requirePublishedSpaceEntity(UUID spaceId) {
        var space =
                spaces.findByIdAndStatus(spaceId, VenueStatus.PUBLISHED)
                        .orElseThrow(() -> new NoSuchElementException("Cancha no encontrada"));
        venues.findByIdAndOrganizationId(space.venueId(), space.organizationId())
                .filter(item -> item.status() == VenueStatus.PUBLISHED)
                .orElseThrow(() -> new NoSuchElementException("Cancha no encontrada"));
        return space;
    }

    private List<SportSpaceEntity> publishedSpaces(VenueEntity venue) {
        return spaces.findAllByOrganizationIdAndVenueIdAndStatusOrderByNameAsc(
                venue.organizationId(), venue.id(), VenueStatus.PUBLISHED);
    }

    private PublicVenueViews.Venue venueView(VenueEntity venue) {
        return new PublicVenueViews.Venue(
                venue.publicSlug(),
                venue.name(),
                venue.address(),
                venue.districtCode(),
                venue.latitude(),
                venue.longitude(),
                venue.publicPhone(),
                amenities.venueAmenities(venue.organizationId(), venue.id()));
    }

    private PublicVenueViews.Space spaceView(SportSpaceEntity space) {
        return new PublicVenueViews.Space(
                space.id(),
                space.name(),
                space.sportCode().name(),
                space.formatCode(),
                space.capacity(),
                space.surfaceType(),
                space.indoor(),
                amenities.spaceAmenities(space.organizationId(), space.id()));
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim().toUpperCase(Locale.ROOT);
    }
}
