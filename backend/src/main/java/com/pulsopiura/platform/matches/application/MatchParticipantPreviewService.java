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
        return participants(matchId, false);
    }

    @Transactional(readOnly = true)
    public List<ParticipantPreview> participants(UUID matchId, boolean organizerView) {
        return jdbc.query(
                """
                select display_name, avatar_url
                from (
                  select coalesce(nullif(p.preferred_display_name, ''), u.display_name) display_name,
                         coalesce(nullif(p.avatar_url, ''), u.avatar_url) avatar_url,
                         participant.joined_at added_at,
                         participant.id
                  from app.match_participants participant
                  join app.users u on u.id = participant.user_id
                  join app.player_profiles p on p.user_id = participant.user_id
                  where participant.match_id = ?
                    and participant.status = 'JOINED'
                    and (? or p.visibility = 'PUBLIC')
                  union all
                  select manual.display_name, null, manual.created_at, manual.id
                  from app.manual_match_participants manual
                  where manual.match_id = ?
                ) roster
                order by added_at nulls last, id
                limit 7
                """,
                (rs, row) ->
                        new ParticipantPreview(
                                rs.getString("display_name"), rs.getString("avatar_url")),
                matchId,
                organizerView,
                matchId);
    }

    public record ParticipantPreview(String displayName, String avatarUrl) {}
}
