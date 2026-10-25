package com.pulsopiura.platform.media.application;

import com.pulsopiura.platform.media.infrastructure.VisualAssetStore;
import com.pulsopiura.platform.shared.media.application.MediaObjects;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VisualAssetService {
    private static final Set<String> SLOTS =
            Set.of("home-matches", "home-venues", "activity", "create", "complexes");
    private final VisualAssetStore assets;
    private final MediaObjects objects;
    private final ApplicationEventPublisher events;

    public VisualAssetService(
            VisualAssetStore assets, MediaObjects objects, ApplicationEventPublisher events) {
        this.assets = assets;
        this.objects = objects;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public List<AssetView> list() {
        return assets.slots().stream().map(this::view).toList();
    }

    @Transactional(readOnly = true)
    public byte[] image(String slot) {
        requireSlot(slot);
        return objects.read(
                assets.key(slot)
                        .orElseThrow(() -> new NoSuchElementException("Imagen no encontrada")));
    }

    @Transactional
    public AssetView put(UUID actor, String slot, byte[] bytes) {
        requireSlot(slot);
        assets.lock(slot);
        var old = assets.key(slot);
        assets.put(slot, objects.create(bytes));
        old.ifPresent(objects::deleteAfterCommit);
        events.publishEvent(
                new VisualAssetAuditEvent(
                        actor, "PLATFORM_VISUAL_ASSET_UPDATED", resourceId(slot)));
        return view(slot);
    }

    @Transactional
    public void delete(UUID actor, String slot) {
        requireSlot(slot);
        assets.lock(slot);
        var old = assets.key(slot);
        assets.delete(slot);
        old.ifPresent(objects::deleteAfterCommit);
        events.publishEvent(
                new VisualAssetAuditEvent(
                        actor, "PLATFORM_VISUAL_ASSET_DELETED", resourceId(slot)));
    }

    private void requireSlot(String slot) {
        if (!SLOTS.contains(slot))
            throw new IllegalArgumentException("Ubicación de imagen inválida");
    }

    private UUID resourceId(String slot) {
        return UUID.nameUUIDFromBytes(("visual-asset:" + slot).getBytes(StandardCharsets.UTF_8));
    }

    private AssetView view(String slot) {
        return new AssetView(slot, "/public/visual-assets/" + slot + "/image");
    }

    public record AssetView(String slot, String imageUrl) {}
}
