package com.pulsopiura.platform.partners.api;

import com.pulsopiura.platform.identity.application.CurrentUserService;
import com.pulsopiura.platform.partners.application.PartnerBusinessService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class PartnerBusinessController {
    private final PartnerBusinessService businesses;
    private final CurrentUserService users;

    public PartnerBusinessController(PartnerBusinessService businesses, CurrentUserService users) {
        this.businesses = businesses;
        this.users = users;
    }

    @GetMapping("/api/v1/businesses")
    List<PartnerBusinessService.BusinessView> published() {
        return businesses.published();
    }

    @GetMapping("/api/v1/businesses/{businessId}/image")
    ResponseEntity<byte[]> image(@PathVariable UUID businessId) {
        var image = businesses.image(businessId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(image.contentType()))
                .cacheControl(CacheControl.noCache().cachePublic())
                .body(image.content());
    }

    @GetMapping("/api/v1/platform/businesses")
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    List<PartnerBusinessService.BusinessView> all() {
        return businesses.all();
    }

    @PostMapping("/api/v1/platform/businesses")
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    ResponseEntity<PartnerBusinessService.BusinessView> create(
            @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody BusinessRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(businesses.create(users.provision(jwt).id(), request.command()));
    }

    @PutMapping("/api/v1/platform/businesses/{businessId}")
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    PartnerBusinessService.BusinessView update(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID businessId,
            @Valid @RequestBody BusinessRequest request) {
        return businesses.update(users.provision(jwt).id(), businessId, request.command());
    }

    @PutMapping(
            value = "/api/v1/platform/businesses/{businessId}/image",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    PartnerBusinessService.BusinessView updateImage(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID businessId,
            @RequestPart("image") MultipartFile image)
            throws java.io.IOException {
        return businesses.updateImage(
                users.provision(jwt).id(), businessId, image.getContentType(), image.getBytes());
    }

    public record BusinessRequest(
            @NotBlank String name,
            @NotBlank String category,
            @NotBlank String zone,
            @Size(max = 500) String description,
            String imageUrl,
            @Size(max = 30) String contactPhone,
            @Size(max = 1000) String mapsUrl,
            @DecimalMin("-90") @DecimalMax("90") BigDecimal latitude,
            @DecimalMin("-180") @DecimalMax("180") BigDecimal longitude,
            @NotBlank String status) {
        PartnerBusinessService.BusinessCommand command() {
            return new PartnerBusinessService.BusinessCommand(
                    name,
                    category,
                    zone,
                    description,
                    imageUrl,
                    contactPhone,
                    mapsUrl,
                    latitude,
                    longitude,
                    status);
        }
    }
}
