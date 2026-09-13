package com.pulsopiura.platform.identity.application;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PlatformAdminQueryService {
    private final JdbcTemplate jdbc;

    public PlatformAdminQueryService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public SummaryView summary() {
        return new SummaryView(
                count("select count(*) from app.users where status = 'ACTIVE'"),
                count("select count(*) from app.capability_requests where status = 'PENDING'"),
                count("select count(*) from app.organizations where status = 'ACTIVE'"),
                count("select count(*) from app.venues where status = 'PUBLISHED'"));
    }

    @Transactional(readOnly = true)
    public List<RequestView> requests() {
        return jdbc.query(
                """
                select r.id, r.user_id, u.display_name, u.email, r.capability, r.status,
                       r.reason, r.created_at, r.reviewed_at
                from app.capability_requests r
                join app.users u on u.id = r.user_id
                order by case r.status when 'PENDING' then 0 else 1 end, r.created_at desc
                """,
                (rs, row) ->
                        new RequestView(
                                rs.getObject("id", UUID.class),
                                rs.getObject("user_id", UUID.class),
                                rs.getString("display_name"),
                                rs.getString("email"),
                                rs.getString("capability"),
                                rs.getString("status"),
                                rs.getString("reason"),
                                rs.getTimestamp("created_at").toInstant(),
                                rs.getTimestamp("reviewed_at") == null
                                        ? null
                                        : rs.getTimestamp("reviewed_at").toInstant()));
    }

    @Transactional(readOnly = true)
    public RequestView request(UUID requestId) {
        return requests().stream()
                .filter(request -> request.id().equals(requestId))
                .findFirst()
                .orElseThrow(() -> new java.util.NoSuchElementException("Solicitud no encontrada"));
    }

    @Transactional(readOnly = true)
    public List<UserView> users() {
        return jdbc.query(
                """
                select u.id, u.display_name, u.email, u.status,
                       coalesce(string_agg(r.capability || ':' || r.status, ', ' order by r.capability), '') capabilities
                from app.users u
                left join app.capability_requests r on r.user_id = u.id
                group by u.id, u.display_name, u.email, u.status, u.created_at
                order by u.created_at desc
                """,
                (rs, row) ->
                        new UserView(
                                rs.getObject("id", UUID.class),
                                rs.getString("display_name"),
                                rs.getString("email"),
                                rs.getString("status"),
                                rs.getString("capabilities")));
    }

    private long count(String sql) {
        var result = jdbc.queryForObject(sql, Long.class);
        return result == null ? 0 : result;
    }

    public record SummaryView(
            long activeUsers, long pendingRequests, long organizations, long venues) {}

    public record RequestView(
            UUID id,
            UUID userId,
            String displayName,
            String email,
            String capability,
            String status,
            String reason,
            Instant createdAt,
            Instant reviewedAt) {}

    public record UserView(
            UUID id, String displayName, String email, String status, String capabilities) {}
}
