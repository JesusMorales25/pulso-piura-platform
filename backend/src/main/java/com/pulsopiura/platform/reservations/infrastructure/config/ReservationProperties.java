package com.pulsopiura.platform.reservations.infrastructure.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.reservations")
public record ReservationProperties(Duration holdDuration, int maxActiveTemporaryPerCustomer) {
    public ReservationProperties {
        if (holdDuration == null
                || holdDuration.compareTo(Duration.ofMinutes(1)) < 0
                || holdDuration.compareTo(Duration.ofMinutes(30)) > 0) {
            throw new IllegalArgumentException(
                    "La duración del hold debe estar entre 1 y 30 minutos");
        }
        if (maxActiveTemporaryPerCustomer < 1 || maxActiveTemporaryPerCustomer > 10) {
            throw new IllegalArgumentException(
                    "El máximo de reservas temporales activas debe estar entre 1 y 10");
        }
    }
}
