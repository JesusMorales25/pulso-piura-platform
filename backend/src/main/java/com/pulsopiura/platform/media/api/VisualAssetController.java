package com.pulsopiura.platform.media.api;

import com.pulsopiura.platform.identity.application.CurrentUserService;
import com.pulsopiura.platform.media.application.VisualAssetService;
import java.io.IOException;
import java.util.List;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1")
public class VisualAssetController {
    private final VisualAssetService assets;
    private final CurrentUserService users;

    public VisualAssetController(VisualAssetService assets, CurrentUserService users) {
        this.assets = assets;
        this.users = users;
    }

    @GetMapping("/public/visual-assets")
    List<VisualAssetService.AssetView> published() {
        return assets.list();
    }

    @GetMapping("/public/visual-assets/{slot}/image")
    ResponseEntity<byte[]> image(@PathVariable String slot) {
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .cacheControl(CacheControl.noStore())
                .header("X-Content-Type-Options", "nosniff")
                .body(assets.image(slot));
    }

    @GetMapping("/platform/visual-assets")
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    List<VisualAssetService.AssetView> all(@AuthenticationPrincipal Jwt jwt) {
        users.provision(jwt);
        return assets.list();
    }

    @PutMapping(
            value = "/platform/visual-assets/{slot}",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    VisualAssetService.AssetView put(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String slot,
            @RequestPart("file") MultipartFile file)
            throws IOException {
        return assets.put(users.provision(jwt).id(), slot, file.getBytes());
    }

    @DeleteMapping("/platform/visual-assets/{slot}")
    @PreAuthorize("hasRole('PLATFORM_ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable String slot) {
        assets.delete(users.provision(jwt).id(), slot);
    }
}
