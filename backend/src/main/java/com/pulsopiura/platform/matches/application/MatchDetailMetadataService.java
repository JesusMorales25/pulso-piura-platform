package com.pulsopiura.platform.matches.application;

import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MatchDetailMetadataService {
    private final JdbcTemplate jdbc;

    public MatchDetailMetadataService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public Metadata load(UUID organizerUserId, UUID sportSpaceId) {
        var organizer =
                jdbc.queryForObject(
                        """
                        select coalesce(nullif(p.preferred_display_name, ''), u.display_name),
                               coalesce(nullif(p.avatar_url, ''), u.avatar_url)
                        from app.users u
                        left join app.player_profiles p on p.user_id = u.id
                        where u.id = ?
                        """,
                        (row, index) ->
                                new Organizer(row.getString(1), row.getString(2)),
                        organizerUserId);
        var surface =
                jdbc.queryForObject(
                        """
                        select coalesce(c.name, s.surface_type)
                        from app.sport_spaces s
                        left join app.surface_types_catalog c on c.code = s.surface_type
                        where s.id = ?
                        """,
                        String.class,
                        sportSpaceId);
        var amenities =
                jdbc.query(
                        """
                        select distinct catalog.name
                        from app.amenities_catalog catalog
                        where catalog.code in (
                          select amenity_code from app.sport_space_amenities where sport_space_id = ?
                          union
                          select venue_amenity.amenity_code
                          from app.venue_amenities venue_amenity
                          join app.sport_spaces space on space.venue_id = venue_amenity.venue_id
                          where space.id = ?
                        )
                        order by catalog.name
                        """,
                        (row, index) -> row.getString(1),
                        sportSpaceId,
                        sportSpaceId);
        return new Metadata(organizer.displayName(), organizer.avatarUrl(), surface, amenities);
    }

    public record Metadata(
            String organizerDisplayName,
            String organizerAvatarUrl,
            String surfaceName,
            List<String> amenityNames) {}

    private record Organizer(String displayName, String avatarUrl) {}
}
