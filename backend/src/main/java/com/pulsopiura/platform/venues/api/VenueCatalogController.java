package com.pulsopiura.platform.venues.api;

import com.pulsopiura.platform.venues.application.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/venue-catalogs")
public class VenueCatalogController {
    private final VenueCatalogService catalogs;

    public VenueCatalogController(VenueCatalogService catalogs) {
        this.catalogs = catalogs;
    }

    @GetMapping
    VenueCatalogView get() {
        return catalogs.getActiveCatalogs();
    }
}
