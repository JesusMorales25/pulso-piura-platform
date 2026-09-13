package com.pulsopiura.platform.partners.application;

import com.pulsopiura.platform.audit.infrastructure.persistence.AuditEventEntity;
import com.pulsopiura.platform.audit.infrastructure.persistence.AuditEventRepository;
import java.math.BigDecimal;
import java.net.URI;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PartnerBusinessService {
    private static final Set<String> CATEGORIES =
            Set.of("CHOPERIA", "RESTAURANT", "SPORTS_BAR", "OTHER");
    private static final Set<String> STATUSES = Set.of("DRAFT", "PUBLISHED", "ARCHIVED");
    private final JdbcTemplate jdbc;
    private final AuditEventRepository auditEvents;
    private final Clock clock = Clock.systemUTC();

    public PartnerBusinessService(JdbcTemplate jdbc, AuditEventRepository auditEvents) {
        this.jdbc = jdbc;
        this.auditEvents = auditEvents;
    }

    @Transactional(readOnly = true)
    public List<BusinessView> published() {
        return query("where status = 'PUBLISHED'");
    }

    @Transactional(readOnly = true)
    public List<BusinessView> all() {
        return query("");
    }

    @Transactional
    public BusinessView create(UUID actor, BusinessCommand command) {
        var id = UUID.randomUUID();
        var now = clock.instant();
        var values = validate(command);
        jdbc.update(
                """
                insert into app.partner_businesses
                  (id, name, category, zone, description, image_url, contact_phone, maps_url, latitude, longitude,
                   status, created_by, updated_by, created_at, updated_at, version)
                values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
                """,
                id,
                values.name(),
                values.category(),
                values.zone(),
                values.description(),
                values.imageUrl(),
                values.contactPhone(),
                values.mapsUrl(),
                values.latitude(),
                values.longitude(),
                values.status(),
                actor,
                actor,
                Timestamp.from(now),
                Timestamp.from(now));
        auditEvents.save(
                AuditEventEntity.resourceAction(
                        actor, null, "PLATFORM_BUSINESS_CREATED", "PARTNER_BUSINESS", id));
        return find(id);
    }

    @Transactional
    public BusinessView update(UUID actor, UUID id, BusinessCommand command) {
        var values = validate(command);
        var changed =
                jdbc.update(
                        """
                        update app.partner_businesses
                        set name = ?, category = ?, zone = ?, description = ?, image_url = ?,
                            contact_phone = ?, maps_url = ?, latitude = ?, longitude = ?, status = ?,
                            updated_by = ?, updated_at = ?, version = version + 1
                        where id = ?
                        """,
                        values.name(),
                        values.category(),
                        values.zone(),
                        values.description(),
                        values.imageUrl(),
                        values.contactPhone(),
                        values.mapsUrl(),
                        values.latitude(),
                        values.longitude(),
                        values.status(),
                        actor,
                        Timestamp.from(clock.instant()),
                        id);
        if (changed == 0) throw new java.util.NoSuchElementException("Negocio no encontrado");
        auditEvents.save(
                AuditEventEntity.resourceAction(
                        actor, null, "PLATFORM_BUSINESS_UPDATED", "PARTNER_BUSINESS", id));
        return find(id);
    }

    private List<BusinessView> query(String condition) {
        return jdbc.query(
                "select id, name, category, zone, description, image_url, contact_phone, maps_url, latitude, longitude, status, updated_at from app.partner_businesses "
                        + condition
                        + " order by updated_at desc",
                (rs, row) ->
                        new BusinessView(
                                rs.getObject("id", UUID.class),
                                rs.getString("name"),
                                rs.getString("category"),
                                rs.getString("zone"),
                                rs.getString("description"),
                                rs.getString("image_url"),
                                rs.getString("contact_phone"),
                                rs.getString("maps_url"),
                                rs.getBigDecimal("latitude"),
                                rs.getBigDecimal("longitude"),
                                rs.getString("status"),
                                rs.getTimestamp("updated_at").toInstant()));
    }

    private BusinessView find(UUID id) {
        return jdbc
                .query(
                        "select id, name, category, zone, description, image_url, contact_phone, maps_url, latitude, longitude, status, updated_at from app.partner_businesses where id = ?",
                        (rs, row) ->
                                new BusinessView(
                                        rs.getObject("id", UUID.class),
                                        rs.getString("name"),
                                        rs.getString("category"),
                                        rs.getString("zone"),
                                        rs.getString("description"),
                                        rs.getString("image_url"),
                                        rs.getString("contact_phone"),
                                        rs.getString("maps_url"),
                                        rs.getBigDecimal("latitude"),
                                        rs.getBigDecimal("longitude"),
                                        rs.getString("status"),
                                        rs.getTimestamp("updated_at").toInstant()),
                        id)
                .stream()
                .findFirst()
                .orElseThrow(() -> new java.util.NoSuchElementException("Negocio no encontrado"));
    }

    private BusinessCommand validate(BusinessCommand input) {
        var name = required(input.name(), "El nombre", 160);
        var category = required(input.category(), "La categoría", 30).toUpperCase(Locale.ROOT);
        var zone = required(input.zone(), "La ubicación", 180);
        var description = optional(input.description(), "La descripción", 500);
        var status = required(input.status(), "El estado", 20).toUpperCase(Locale.ROOT);
        if (!CATEGORIES.contains(category))
            throw new IllegalArgumentException("Categoría inválida");
        if (!STATUSES.contains(status)) throw new IllegalArgumentException("Estado inválido");
        var image =
                input.imageUrl() == null || input.imageUrl().isBlank()
                        ? null
                        : input.imageUrl().trim();
        if (image != null
                && (!image.startsWith("/images/") && !image.startsWith("https://")
                        || image.length() > 500)) {
            throw new IllegalArgumentException(
                    "La imagen debe usar HTTPS o una imagen local permitida");
        }
        var contactPhone = optional(input.contactPhone(), "El teléfono", 30);
        var mapsUrl = validateMapsUrl(input.mapsUrl());
        var latitude = input.latitude();
        var longitude = input.longitude();
        if ((latitude == null) != (longitude == null)) {
            throw new IllegalArgumentException("La latitud y longitud deben registrarse juntas");
        }
        if (latitude != null
                && (latitude.compareTo(BigDecimal.valueOf(-90)) < 0
                        || latitude.compareTo(BigDecimal.valueOf(90)) > 0)) {
            throw new IllegalArgumentException("La latitud debe estar entre -90 y 90");
        }
        if (longitude != null
                && (longitude.compareTo(BigDecimal.valueOf(-180)) < 0
                        || longitude.compareTo(BigDecimal.valueOf(180)) > 0)) {
            throw new IllegalArgumentException("La longitud debe estar entre -180 y 180");
        }
        if (contactPhone != null
                && (!contactPhone.matches("[+0-9() .-]+")
                        || contactPhone.replaceAll("\\D", "").length() < 8)) {
            throw new IllegalArgumentException("El teléfono de contacto no es válido");
        }
        if ("PUBLISHED".equals(status) && contactPhone == null) {
            throw new IllegalArgumentException("Para publicar agrega un teléfono de contacto");
        }
        return new BusinessCommand(
                name,
                category,
                zone,
                description,
                image,
                contactPhone,
                mapsUrl,
                latitude,
                longitude,
                status);
    }

    private String required(String value, String label, int max) {
        if (value == null || value.isBlank())
            throw new IllegalArgumentException(label + " es obligatorio");
        var clean = value.trim();
        if (clean.length() > max)
            throw new IllegalArgumentException(label + " excede " + max + " caracteres");
        return clean;
    }

    private String optional(String value, String label, int max) {
        if (value == null || value.isBlank()) return null;
        var clean = value.trim();
        if (clean.length() > max)
            throw new IllegalArgumentException(label + " excede " + max + " caracteres");
        return clean;
    }

    private String validateMapsUrl(String value) {
        var clean = optional(value, "El enlace de Google Maps", 1000);
        if (clean == null) return null;
        try {
            var uri = URI.create(clean);
            var host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
            var trustedHost =
                    host.equals("google.com")
                            || host.endsWith(".google.com")
                            || host.equals("maps.app.goo.gl")
                            || host.equals("goo.gl");
            if (!"https".equalsIgnoreCase(uri.getScheme()) || !trustedHost) {
                throw new IllegalArgumentException();
            }
            return uri.toString();
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Pega un enlace válido de Google Maps");
        }
    }

    public record BusinessCommand(
            String name,
            String category,
            String zone,
            String description,
            String imageUrl,
            String contactPhone,
            String mapsUrl,
            BigDecimal latitude,
            BigDecimal longitude,
            String status) {}

    public record BusinessView(
            UUID id,
            String name,
            String category,
            String zone,
            String description,
            String imageUrl,
            String contactPhone,
            String mapsUrl,
            BigDecimal latitude,
            BigDecimal longitude,
            String status,
            Instant updatedAt) {}
}
