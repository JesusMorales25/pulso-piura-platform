package com.pulsopiura.platform.venues.api;

import com.pulsopiura.platform.venues.application.PublicVenueQueryService;
import com.pulsopiura.platform.venues.application.PublicVenueViews;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class PublicVenueController {
    private final PublicVenueQueryService publicVenues;

    public PublicVenueController(PublicVenueQueryService publicVenues) {
        this.publicVenues = publicVenues;
    }

    @GetMapping("/venues")
    PublicVenueViews.VenuePage search(
            @RequestParam(required = false) String district,
            @RequestParam(required = false) String sport,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate date,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return publicVenues.search(district, sport, date, page, size);
    }

    @GetMapping("/venues/{publicSlug}")
    PublicVenueViews.Venue get(@PathVariable String publicSlug) {
        return publicVenues.getVenue(publicSlug);
    }

    @GetMapping("/venues/{publicSlug}/spaces")
    List<PublicVenueViews.Space> spaces(@PathVariable String publicSlug) {
        return publicVenues.listSpaces(publicSlug);
    }

    @GetMapping("/spaces/{spaceId}/availability")
    PublicVenueViews.Availability availability(
            @PathVariable UUID spaceId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return publicVenues.availability(spaceId, date);
    }
}
