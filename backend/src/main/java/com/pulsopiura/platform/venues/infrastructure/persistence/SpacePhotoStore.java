package com.pulsopiura.platform.venues.infrastructure.persistence;

import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class SpacePhotoStore {
    private final JdbcTemplate jdbc;

    public SpacePhotoStore(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void requireSpace(UUID org, UUID space, boolean lock) {
        var ids =
                jdbc.queryForList(
                        "select id from app.sport_spaces where organization_id = ? and id = ?"
                                + (lock ? " for update" : ""),
                        UUID.class,
                        org,
                        space);
        if (ids.isEmpty()) throw new NoSuchElementException("Cancha no encontrada");
    }

    public void requirePublished(UUID space) {
        var ids =
                jdbc.queryForList(
                        """
            select s.id from app.sport_spaces s
            join app.venues v on v.id = s.venue_id and v.organization_id = s.organization_id
            join app.organizations o on o.id = s.organization_id
            where s.id = ? and s.status = 'PUBLISHED' and v.status = 'PUBLISHED' and o.status = 'ACTIVE'
            """,
                        UUID.class,
                        space);
        if (ids.isEmpty()) throw new NoSuchElementException("Cancha no encontrada");
    }

    public List<Photo> list(UUID space) {
        return jdbc.query(
                "select id, storage_key, caption, cover, position from app.sport_space_photos where space_id = ? order by position, id",
                (rs, row) ->
                        new Photo(
                                rs.getObject("id", UUID.class),
                                rs.getString("storage_key"),
                                rs.getString("caption"),
                                rs.getBoolean("cover"),
                                rs.getInt("position")),
                space);
    }

    public void insert(
            UUID id,
            UUID org,
            UUID space,
            String key,
            String caption,
            boolean cover,
            int position) {
        jdbc.update(
                "insert into app.sport_space_photos(id, organization_id, space_id, storage_key, caption, cover, position) values (?,?,?,?,?,?,?)",
                id,
                org,
                space,
                key,
                caption,
                cover,
                position);
    }

    public void cover(UUID space, UUID photo) {
        jdbc.update(
                "update app.sport_space_photos set cover = false where space_id = ? and cover",
                space);
        jdbc.update(
                "update app.sport_space_photos set cover = true where space_id = ? and id = ?",
                space,
                photo);
    }

    public void delete(UUID space, UUID photo) {
        jdbc.update(
                "delete from app.sport_space_photos where space_id = ? and id = ?", space, photo);
    }

    public record Photo(UUID id, String key, String caption, boolean cover, int position) {}
}
