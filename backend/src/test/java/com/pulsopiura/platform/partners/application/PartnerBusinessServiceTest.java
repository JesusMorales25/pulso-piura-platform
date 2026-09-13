package com.pulsopiura.platform.partners.application;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;

import com.pulsopiura.platform.audit.infrastructure.persistence.AuditEventRepository;
import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

@ExtendWith(MockitoExtension.class)
class PartnerBusinessServiceTest {
    @Mock JdbcTemplate jdbc;
    @Mock AuditEventRepository auditEvents;

    @Test
    void rejectsUnsafeImageUrlsBeforeWriting() {
        var service = new PartnerBusinessService(jdbc, auditEvents);
        var command =
                new PartnerBusinessService.BusinessCommand(
                        "Restaurante prueba",
                        "RESTAURANT",
                        "Piura",
                        "Comida piurana",
                        "javascript:alert(1)",
                        "+51 999 888 777",
                        null,
                        new BigDecimal("-5.1945"),
                        new BigDecimal("-80.6328"),
                        "PUBLISHED");

        assertThatThrownBy(() -> service.create(UUID.randomUUID(), command))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("HTTPS");
        verifyNoInteractions(jdbc);
        verifyNoInteractions(auditEvents);
    }

    @Test
    void rejectsPublishedBusinessWithoutContact() {
        var service = new PartnerBusinessService(jdbc, auditEvents);
        var command =
                new PartnerBusinessService.BusinessCommand(
                        "Chopería prueba",
                        "CHOPERIA",
                        "Piura",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        "PUBLISHED");

        assertThatThrownBy(() -> service.create(UUID.randomUUID(), command))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("teléfono de contacto");
        verifyNoInteractions(jdbc);
        verifyNoInteractions(auditEvents);
    }

    @Test
    void rejectsIncompleteCoordinatePair() {
        var service = new PartnerBusinessService(jdbc, auditEvents);
        var command =
                new PartnerBusinessService.BusinessCommand(
                        "Restaurante prueba",
                        "RESTAURANT",
                        "Piura",
                        null,
                        null,
                        "+51 999 888 777",
                        null,
                        new BigDecimal("-5.1945"),
                        null,
                        "DRAFT");

        assertThatThrownBy(() -> service.create(UUID.randomUUID(), command))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("juntas");
        verifyNoInteractions(jdbc);
        verifyNoInteractions(auditEvents);
    }

    @Test
    void rejectsLinksOutsideGoogleMaps() {
        var service = new PartnerBusinessService(jdbc, auditEvents);
        var command =
                new PartnerBusinessService.BusinessCommand(
                        "Restaurante prueba",
                        "RESTAURANT",
                        "Piura",
                        null,
                        null,
                        "+51 999 888 777",
                        "https://example.com/ubicacion",
                        null,
                        null,
                        "DRAFT");

        assertThatThrownBy(() -> service.create(UUID.randomUUID(), command))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Google Maps");
        verifyNoInteractions(jdbc);
        verifyNoInteractions(auditEvents);
    }
}
