package com.pulsopiura.platform.venues.application;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.pulsopiura.platform.shared.media.application.MediaStorage;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
@EnabledIfSystemProperty(named = "runMediaDatabaseTests", matches = "true")
class SpacePhotoDatabaseTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired SpacePhotoService photos;
    @MockitoBean MediaStorage storage;
    UUID owner, admin, operator, outsider, org, space, venue;

    @BeforeEach
    void setup() throws Exception {
        try (var c = Objects.requireNonNull(jdbc.getDataSource()).getConnection()) {
            assertThat(c.getMetaData().getURL())
                    .matches("jdbc:postgresql://(127\\.0\\.0\\.1|localhost):[0-9]+/.*test.*");
        }
        owner = user();
        admin = user();
        operator = user();
        outsider = user();
        org = UUID.randomUUID();
        venue = UUID.randomUUID();
        space = UUID.randomUUID();
        jdbc.update(
                "insert into app.organizations(id,name,slug,status,created_by,created_at,updated_at) values (?,? ,?,'ACTIVE',?,now(),now())",
                org,
                "Media test " + org,
                org.toString(),
                owner);
        for (var entry : Map.of(owner, "OWNER", admin, "ADMIN", operator, "OPERATOR").entrySet()) {
            jdbc.update(
                    "insert into app.organization_memberships(id,organization_id,user_id,role,status,created_at) values (?,?,?,?,'ACTIVE',now())",
                    UUID.randomUUID(),
                    org,
                    entry.getKey(),
                    entry.getValue());
        }
        jdbc.update(
                "insert into app.venues(id,organization_id,name,slug,public_slug,address,district_code,status,created_by,created_at,updated_at) values (?,?,?,?,?,?,'PIURA','PUBLISHED',?,now(),now())",
                venue,
                org,
                "Media test " + venue,
                venue.toString(),
                venue.toString(),
                "Test address " + venue,
                owner);
        jdbc.update(
                "insert into app.sport_spaces(id,organization_id,venue_id,name,sport_code,format_code,capacity,status,created_by,created_at,updated_at) values (?,?,?,'Court','FOOTBALL','FOOTBALL_7',14,'PUBLISHED',?,now(),now())",
                space,
                org,
                venue,
                owner);
        when(storage.store(any()))
                .thenAnswer(
                        i -> new MediaStorage.StoredImage(UUID.randomUUID() + ".png", "test", 1));
        when(storage.read(any())).thenReturn(new byte[] {1, 2, 3});
    }

    UUID user() {
        var id = UUID.randomUUID();
        jdbc.update(
                "insert into app.users(id,identity_subject,display_name,status,created_at,updated_at) values (?,?,?,'ACTIVE',now(),now())",
                id,
                "media-" + id,
                "Media test");
        return id;
    }

    @Test
    void ownerUploadsThreeAdminChoosesCoverAndDeleteSelectsRemaining() {
        var first = photos.add(owner, org, space, "Front", new byte[] {1});
        var second = photos.add(owner, org, space, "Side", new byte[] {1});
        var third = photos.add(admin, org, space, "Other", new byte[] {1});
        assertThat(photos.published(space)).hasSize(3);
        assertThat(first.cover()).isTrue();
        photos.cover(admin, org, space, third.id());
        assertThat(
                        photos.list(owner, org, space).stream()
                                .filter(SpacePhotoService.PhotoView::cover)
                                .map(SpacePhotoService.PhotoView::id))
                .containsExactly(third.id());
        photos.delete(owner, org, space, third.id());
        assertThat(photos.list(owner, org, space)).hasSize(2);
        assertThat(photos.list(owner, org, space).getFirst().cover()).isTrue();
        assertThat(photos.image(owner, org, space, second.id())).containsExactly(1, 2, 3);
    }

    @Test
    void operatorCanReadButCannotWriteAndOtherTenantCannotReadOrWrite() {
        assertThat(photos.list(operator, org, space)).isEmpty();
        assertThatThrownBy(() -> photos.add(operator, org, space, "", new byte[] {1}))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> photos.list(outsider, org, space))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> photos.add(owner, UUID.randomUUID(), space, "", new byte[] {1}))
                .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(storage);
    }

    @Test
    void publicReadsDisappearWhenVenueOrOrganizationStopsBeingPublic() {
        var photo = photos.add(owner, org, space, "", new byte[] {1});
        assertThat(photos.publishedImage(space, photo.id())).containsExactly(1, 2, 3);
        jdbc.update("update app.venues set status='DRAFT' where id=?", venue);
        assertThatThrownBy(() -> photos.published(space))
                .isInstanceOf(NoSuchElementException.class);
        jdbc.update("update app.venues set status='PUBLISHED' where id=?", venue);
        jdbc.update("update app.organizations set status='SUSPENDED' where id=?", org);
        assertThatThrownBy(() -> photos.publishedImage(space, photo.id()))
                .isInstanceOf(NoSuchElementException.class);
    }
}
