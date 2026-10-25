package com.pulsopiura.platform.venues.api;

import com.pulsopiura.platform.identity.application.CurrentUserService;
import com.pulsopiura.platform.venues.application.SpacePhotoService;
import java.io.IOException;
import java.util.*;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1")
public class SpacePhotoController {
    private final SpacePhotoService photos;
    private final CurrentUserService users;

    public SpacePhotoController(SpacePhotoService photos, CurrentUserService users) {
        this.photos = photos;
        this.users = users;
    }

    @GetMapping("/organizations/{organizationId}/spaces/{spaceId}/photos")
    List<SpacePhotoService.PhotoView> list(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId,
            @PathVariable UUID spaceId) {
        return photos.list(users.provision(jwt).id(), organizationId, spaceId);
    }

    @PostMapping(
            value = "/organizations/{organizationId}/spaces/{spaceId}/photos",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    SpacePhotoService.PhotoView add(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId,
            @PathVariable UUID spaceId,
            @RequestPart("file") MultipartFile file,
            @RequestParam(required = false) String caption)
            throws IOException {
        return photos.add(
                users.provision(jwt).id(), organizationId, spaceId, caption, file.getBytes());
    }

    @PutMapping("/organizations/{organizationId}/spaces/{spaceId}/photos/{photoId}/cover")
    SpacePhotoService.PhotoView cover(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId,
            @PathVariable UUID spaceId,
            @PathVariable UUID photoId) {
        return photos.cover(users.provision(jwt).id(), organizationId, spaceId, photoId);
    }

    @DeleteMapping("/organizations/{organizationId}/spaces/{spaceId}/photos/{photoId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId,
            @PathVariable UUID spaceId,
            @PathVariable UUID photoId) {
        photos.delete(users.provision(jwt).id(), organizationId, spaceId, photoId);
    }

    @GetMapping("/organizations/{organizationId}/spaces/{spaceId}/photos/{photoId}/image")
    ResponseEntity<byte[]> image(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID organizationId,
            @PathVariable UUID spaceId,
            @PathVariable UUID photoId) {
        return imageResponse(
                photos.image(users.provision(jwt).id(), organizationId, spaceId, photoId));
    }

    @GetMapping("/public/spaces/{spaceId}/photos")
    List<SpacePhotoService.PhotoView> published(@PathVariable UUID spaceId) {
        return photos.published(spaceId);
    }

    @GetMapping("/public/spaces/{spaceId}/photos/{photoId}/image")
    ResponseEntity<byte[]> publishedImage(@PathVariable UUID spaceId, @PathVariable UUID photoId) {
        return imageResponse(photos.publishedImage(spaceId, photoId));
    }

    private ResponseEntity<byte[]> imageResponse(byte[] bytes) {
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .cacheControl(CacheControl.noStore())
                .header("X-Content-Type-Options", "nosniff")
                .body(bytes);
    }
}
