package com.pulsopiura.platform.foundation.web;

import java.time.Instant;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class HealthController {
    @GetMapping("/health")
    Map<String, Object> health() {
        return Map.of("status", "UP", "service", "pulso-piura-api", "timestamp", Instant.now());
    }
}
