package com.pulsopiura.platform.venues.application;

import java.util.*;

public record SportSpaceView(
        UUID id,
        UUID organizationId,
        UUID venueId,
        String name,
        String sportCode,
        String formatCode,
        int capacity,
        String surfaceType,
        boolean indoor,
        Set<String> amenityCodes,
        String status,
        long version) {}
