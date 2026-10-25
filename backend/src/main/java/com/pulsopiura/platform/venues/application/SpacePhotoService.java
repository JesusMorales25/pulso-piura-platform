package com.pulsopiura.platform.venues.application;

import com.pulsopiura.platform.organizations.application.OrganizationAuthorization;
import com.pulsopiura.platform.organizations.domain.OrganizationPermission;
import com.pulsopiura.platform.shared.media.application.MediaObjects;
import com.pulsopiura.platform.venues.infrastructure.persistence.SpacePhotoStore;
import java.util.*;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SpacePhotoService {
    private final SpacePhotoStore photos;
    private final OrganizationAuthorization authorization;
    private final MediaObjects objects;
    private final ApplicationEventPublisher events;

    public SpacePhotoService(
            SpacePhotoStore photos,
            OrganizationAuthorization authorization,
            MediaObjects objects,
            ApplicationEventPublisher events) {
        this.photos = photos;
        this.authorization = authorization;
        this.objects = objects;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public List<PhotoView> list(UUID actor, UUID org, UUID space) {
        require(actor, org, space, false);
        return views(photos.list(space), "/organizations/" + org + "/spaces/" + space);
    }

    @Transactional(readOnly = true)
    public List<PhotoView> published(UUID space) {
        photos.requirePublished(space);
        return views(photos.list(space), "/public/spaces/" + space);
    }

    @Transactional(readOnly = true)
    public byte[] image(UUID actor, UUID org, UUID space, UUID photo) {
        require(actor, org, space, false);
        return objects.read(find(space, photo).key());
    }

    @Transactional(readOnly = true)
    public byte[] publishedImage(UUID space, UUID photo) {
        photos.requirePublished(space);
        return objects.read(find(space, photo).key());
    }

    @Transactional
    public PhotoView add(UUID actor, UUID org, UUID space, String caption, byte[] bytes) {
        require(actor, org, space, true);
        if (caption == null) caption = "";
        caption = caption.strip();
        if (caption.length() > 200)
            throw new IllegalArgumentException("La descripción admite hasta 200 caracteres");
        var existing = photos.list(space);
        if (existing.size() >= 8)
            throw new IllegalArgumentException("La cancha admite hasta 8 fotos");
        var id = UUID.randomUUID();
        int position =
                existing.stream().mapToInt(SpacePhotoStore.Photo::position).max().orElse(-1) + 1;
        photos.insert(id, org, space, objects.create(bytes), caption, existing.isEmpty(), position);
        audit(actor, org, "SPORT_SPACE_PHOTO_ADDED", id);
        return new PhotoView(id, caption, existing.isEmpty(), position, ownerPath(org, space, id));
    }

    @Transactional
    public PhotoView cover(UUID actor, UUID org, UUID space, UUID photo) {
        require(actor, org, space, true);
        var selected = find(space, photo);
        photos.cover(space, photo);
        audit(actor, org, "SPORT_SPACE_PHOTO_COVER_CHANGED", photo);
        return new PhotoView(
                photo, selected.caption(), true, selected.position(), ownerPath(org, space, photo));
    }

    @Transactional
    public void delete(UUID actor, UUID org, UUID space, UUID photo) {
        require(actor, org, space, true);
        var selected = find(space, photo);
        photos.delete(space, photo);
        if (selected.cover()) {
            var remaining = photos.list(space);
            if (!remaining.isEmpty()) photos.cover(space, remaining.getFirst().id());
        }
        objects.deleteAfterCommit(selected.key());
        audit(actor, org, "SPORT_SPACE_PHOTO_DELETED", photo);
    }

    private void require(UUID actor, UUID org, UUID space, boolean write) {
        authorization.require(
                actor,
                org,
                write ? OrganizationPermission.MANAGE_ORGANIZATION : OrganizationPermission.VIEW);
        photos.requireSpace(org, space, write);
    }

    private SpacePhotoStore.Photo find(UUID space, UUID id) {
        return photos.list(space).stream()
                .filter(p -> p.id().equals(id))
                .findFirst()
                .orElseThrow(() -> new NoSuchElementException("Foto no encontrada"));
    }

    private List<PhotoView> views(List<SpacePhotoStore.Photo> source, String prefix) {
        return source.stream()
                .map(
                        p ->
                                new PhotoView(
                                        p.id(),
                                        p.caption(),
                                        p.cover(),
                                        p.position(),
                                        prefix + "/photos/" + p.id() + "/image"))
                .toList();
    }

    private String ownerPath(UUID org, UUID space, UUID photo) {
        return "/organizations/" + org + "/spaces/" + space + "/photos/" + photo + "/image";
    }

    private void audit(UUID actor, UUID org, String action, UUID photo) {
        events.publishEvent(new VenueAuditEvent(actor, org, action, "SPORT_SPACE_PHOTO", photo));
    }

    public record PhotoView(
            UUID id, String caption, boolean cover, int position, String imageUrl) {}
}
