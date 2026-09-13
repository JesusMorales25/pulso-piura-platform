package com.pulsopiura.platform.reservations.api;

import com.pulsopiura.platform.reservations.application.BookableAvailabilityService;
import com.pulsopiura.platform.venues.application.PublicVenueViews;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/spaces/{spaceId}/bookable-slots")
public class BookableAvailabilityController {
    private final BookableAvailabilityService availability;

    public BookableAvailabilityController(BookableAvailabilityService availability) {
        this.availability = availability;
    }

    @GetMapping
    PublicVenueViews.Availability get(@PathVariable UUID spaceId, @RequestParam LocalDate date) {
        return availability.availability(spaceId, date);
    }
}
