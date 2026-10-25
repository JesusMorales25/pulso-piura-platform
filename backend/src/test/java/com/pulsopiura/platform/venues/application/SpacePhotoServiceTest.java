package com.pulsopiura.platform.venues.application;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.pulsopiura.platform.organizations.application.OrganizationAuthorization;
import com.pulsopiura.platform.organizations.domain.OrganizationPermission;
import com.pulsopiura.platform.shared.media.application.MediaObjects;
import com.pulsopiura.platform.venues.infrastructure.persistence.SpacePhotoStore;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;

class SpacePhotoServiceTest {
    final SpacePhotoStore store = mock(SpacePhotoStore.class);
    final OrganizationAuthorization auth = mock(OrganizationAuthorization.class);
    final MediaObjects objects = mock(MediaObjects.class);
    final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    final SpacePhotoService service = new SpacePhotoService(store, auth, objects, events);
    final UUID actor = UUID.randomUUID(), org = UUID.randomUUID(), space = UUID.randomUUID();

    @Test
    void permissionFailureDoesNotReadOrWriteImages() {
        doThrow(new AccessDeniedException("Denied"))
                .when(auth)
                .require(actor, org, OrganizationPermission.MANAGE_ORGANIZATION);
        assertThatThrownBy(() -> service.add(actor, org, space, "", new byte[] {1}))
                .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(store, objects, events);
    }

    @Test
    void tenantMismatchStopsBeforeObjectStorage() {
        doThrow(new NoSuchElementException()).when(store).requireSpace(org, space, true);
        assertThatThrownBy(() -> service.add(actor, org, space, "", new byte[] {1}))
                .isInstanceOf(NoSuchElementException.class);
        verifyNoInteractions(objects);
    }

    @Test
    void thirdPhotoKeepsExistingCoverAndOrderedGallery() {
        var first = new SpacePhotoStore.Photo(UUID.randomUUID(), "one", "", true, 0);
        var second = new SpacePhotoStore.Photo(UUID.randomUUID(), "two", "", false, 1);
        when(store.list(space)).thenReturn(List.of(first, second));
        when(objects.create(any())).thenReturn("three");
        var added = service.add(actor, org, space, " Desde la tribuna ", new byte[] {1});
        assertThat(added.position()).isEqualTo(2);
        assertThat(added.cover()).isFalse();
        assertThat(added.caption()).isEqualTo("Desde la tribuna");
        verify(store).requireSpace(org, space, true);
        verify(store).insert(added.id(), org, space, "three", "Desde la tribuna", false, 2);
    }

    @Test
    void deletingCoverSelectsNextAndDeletesOnlyAfterCommit() {
        var first = new SpacePhotoStore.Photo(UUID.randomUUID(), "one", "", true, 0);
        var second = new SpacePhotoStore.Photo(UUID.randomUUID(), "two", "", false, 1);
        when(store.list(space)).thenReturn(List.of(first, second), List.of(second));
        service.delete(actor, org, space, first.id());
        verify(store).cover(space, second.id());
        verify(objects).deleteAfterCommit("one");
    }

    @Test
    void coverCannotReferToAnotherCourt() {
        when(store.list(space)).thenReturn(List.of());
        assertThatThrownBy(() -> service.cover(actor, org, space, UUID.randomUUID()))
                .isInstanceOf(NoSuchElementException.class);
        verify(store, never()).cover(any(), any());
    }

    @Test
    void ninthPhotoAndLongCaptionAreRejectedBeforeStorage() {
        var photo = new SpacePhotoStore.Photo(UUID.randomUUID(), "one", "", true, 0);
        when(store.list(space)).thenReturn(Collections.nCopies(8, photo));
        assertThatThrownBy(() -> service.add(actor, org, space, "", new byte[] {1}))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.add(actor, org, space, "x".repeat(201), new byte[] {1}))
                .isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(objects);
    }

    @Test
    void publicPhotoRequiresPublishedSpaceBeforeReadingStorage() {
        doThrow(new NoSuchElementException()).when(store).requirePublished(space);
        assertThatThrownBy(() -> service.publishedImage(space, UUID.randomUUID()))
                .isInstanceOf(NoSuchElementException.class);
        verifyNoInteractions(objects);
    }
}
