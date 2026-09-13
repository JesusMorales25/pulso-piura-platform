package com.pulsopiura.platform.matches.application;

import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MatchParticipantPreviewService {
    private final JdbcTemplate jdbc;

    public MatchParticipantPreviewService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public List<ParticipantPreview> publicParticipants(UUID matchId) {
        return jdbc.query(
                """
                select coalesce(nullif(p.preferred_display_name, ''), u.display_name) display_name,
                       coalesce(nullif(p.avatar_url, ''), u.avatar_url) avatar_url
                from app.match_participants participant
                join app.users u on u.id = participant.user_id
                join app.player_profiles p on p.user_id = participant.user_id
                where participant.match_id = ?
                  and participant.status = 'JOINED'
                  and p.visibility = 'PUBLIC'
                order by participant.joined_at nulls last, participant.id
                limit 7
                """,
                (rs, row) ->
                        new ParticipantPreview(
                                rs.getString("display_name"), rs.getString("avatar_url")),
                matchId);
    }

    public record ParticipantPreview(String displayName, String avatarUrl) {}
}
