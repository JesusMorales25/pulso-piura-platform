package com.pulsopiura.platform.venues.api;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.Validation;
import java.util.Set;
import org.junit.jupiter.api.Test;

class VenuePhoneValidationTest {
    @Test
    void bothVenueEndpointsRejectMoreThanNineLocalDigits() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            for (String phone :
                    new String[] {"987654321111", "+519876543211", "123", "abcdefghi"}) {
                var create =
                        new VenueController.CreateVenueRequest(
                                "Sede",
                                "Av. Prueba 123",
                                "Piura",
                                null,
                                null,
                                phone,
                                null,
                                null,
                                Set.of());
                var update =
                        new VenueController.UpdateVenueRequest(
                                "Sede",
                                "Av. Prueba 123",
                                "Piura",
                                null,
                                null,
                                phone,
                                null,
                                null,
                                Set.of(),
                                0);
                assertThat(validator.validate(create))
                        .anyMatch(v -> v.getPropertyPath().toString().equals("publicPhone"));
                assertThat(validator.validate(update))
                        .anyMatch(v -> v.getPropertyPath().toString().equals("publicPhone"));
            }
            for (String phone : new String[] {null, "987654321", "+51987654321"}) {
                assertThat(
                                validator.validate(
                                        new VenueController.CreateVenueRequest(
                                                "Sede",
                                                "Av. Prueba 123",
                                                "Piura",
                                                null,
                                                null,
                                                phone,
                                                null,
                                                null,
                                                Set.of())))
                        .isEmpty();
            }
        }
    }
}
