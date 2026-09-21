package com.pulsopiura.platform.matches.application;

import com.pulsopiura.platform.reservations.application.ReservationConflictException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MatchCheckInService {
    private static final String PAYLOAD_PREFIX = "PULSO-MATCH:";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final JdbcTemplate jdbc;
    private final Clock clock;

    @Autowired
    public MatchCheckInService(JdbcTemplate jdbc) {
        this(jdbc, Clock.systemUTC());
    }

    MatchCheckInService(JdbcTemplate jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    @Transactional
    public MatchPass issue(UUID actor, String publicSlug) {
        var context = playerContext(actor, publicSlug);
        if (!"JOINED".equals(context.participationStatus())) {
            throw new ReservationConflictException(
                    "El QR se habilita cuando tu cupo está confirmado");
        }
        if (!"PUBLISHED".equals(context.matchStatus())) {
            throw new ReservationConflictException("Este partido ya no admite pases de ingreso");
        }
        if (context.checkedInAt() != null) {
            throw new ReservationConflictException("Tu ingreso a este partido ya fue registrado");
        }
        var now = clock.instant();
        var validUntil = context.endsAt().plusSeconds(4 * 60 * 60);
        if (!now.isBefore(validUntil)) {
            throw new ReservationConflictException("La vigencia de este partido ya terminó");
        }
        var token = newToken();
        jdbc.update(
                """
                insert into app.match_check_in_passes
                  (participant_id, token_hash, issued_at, valid_until, consumed_at, consumed_by)
                values (?, ?, ?, ?, null, null)
                on conflict (participant_id) do update set
                  token_hash = excluded.token_hash,
                  issued_at = excluded.issued_at,
                  valid_until = excluded.valid_until,
                  consumed_at = null,
                  consumed_by = null
                """,
                context.participantId(),
                hash(token),
                now,
                validUntil);
        return new MatchPass(
                context.matchId(),
                context.participantId(),
                PAYLOAD_PREFIX + token,
                now,
                validUntil);
    }

    @Transactional(readOnly = true)
    public CheckInPlayer preview(UUID actor, UUID matchId, String payload) {
        var value = checkInContext(actor, matchId, payload);
        validate(value);
        return view(value);
    }

    @Transactional
    public CheckInPlayer checkIn(UUID actor, UUID matchId, String payload) {
        var value = checkInContext(actor, matchId, payload);
        validate(value);
        if (value.checkedInAt() != null) return view(value);
        var now = clock.instant();
        var updated =
                jdbc.update(
                        """
                update app.match_check_in_passes
                set consumed_at = ?, consumed_by = ?
                where participant_id = ? and consumed_at is null and valid_until > ?
                """,
                        now,
                        actor,
                        value.participantId(),
                        now);
        if (updated != 1)
            throw new ReservationConflictException("Este QR ya fue utilizado o venció");
        return new CheckInPlayer(
                value.matchId(),
                value.participantId(),
                value.playerName(),
                value.playerEmail(),
                value.avatarUrl(),
                value.participationStatus(),
                value.paymentStatus(),
                value.paidMinor(),
                value.currency(),
                now);
    }

    private PlayerContext playerContext(UUID actor, String publicSlug) {
        var values =
                jdbc.query(
                        """
                select p.id participant_id, m.id match_id, p.status participation_status,
                       m.status match_status, m.ends_at, pass.consumed_at checked_in_at
                from app.match_participants p
                join app.sports_matches m on m.id = p.match_id
                left join app.match_check_in_passes pass on pass.participant_id = p.id
                where p.user_id = ? and m.public_slug = ? and p.status <> 'WITHDRAWN'
                """,
                        (rs, row) ->
                                new PlayerContext(
                                        rs.getObject("participant_id", UUID.class),
                                                rs.getObject("match_id", UUID.class),
                                        rs.getString("participation_status"),
                                                rs.getString("match_status"),
                                        rs.getTimestamp("ends_at").toInstant(),
                                                instant(rs.getTimestamp("checked_in_at"))),
                        actor,
                        publicSlug);
        if (values.isEmpty()) throw new NoSuchElementException("Inscripción no encontrada");
        return values.getFirst();
    }

    private CheckInContext checkInContext(UUID actor, UUID matchId, String payload) {
        var values =
                jdbc.query(
                        """
                select m.id match_id, m.ends_at, p.id participant_id, p.status participation_status,
                       u.display_name player_name, u.email player_email,
                       coalesce(profile.avatar_url, u.avatar_url) avatar_url,
                       pass.valid_until, pass.consumed_at,
                       coalesce(o.status, case when m.price_minor = 0 then 'NOT_REQUIRED' else 'UNPAID' end) payment_status,
                       case when o.status = 'PAID' then o.amount_minor else 0 end paid_minor,
                       m.currency
                from app.match_check_in_passes pass
                join app.match_participants p on p.id = pass.participant_id
                join app.sports_matches m on m.id = p.match_id
                join app.users u on u.id = p.user_id
                left join app.player_profiles profile on profile.user_id = p.user_id
                left join lateral (
                  select status, amount_minor from app.match_join_orders jo
                  where jo.match_id = p.match_id and jo.payer_user_id = p.user_id
                  order by (jo.status = 'PAID') desc, jo.created_at desc limit 1
                ) o on true
                where pass.token_hash = ? and m.id = ? and m.organizer_user_id = ?
                """,
                        (rs, row) ->
                                new CheckInContext(
                                        rs.getObject("match_id", UUID.class),
                                        rs.getObject("participant_id", UUID.class),
                                        rs.getString("player_name"),
                                        rs.getString("player_email"),
                                        rs.getString("avatar_url"),
                                        rs.getString("participation_status"),
                                        rs.getString("payment_status"),
                                        rs.getLong("paid_minor"),
                                        rs.getString("currency"),
                                        rs.getTimestamp("ends_at").toInstant(),
                                        rs.getTimestamp("valid_until").toInstant(),
                                        instant(rs.getTimestamp("consumed_at"))),
                        hash(extractToken(payload)),
                        matchId,
                        actor);
        if (values.isEmpty()) throw new NoSuchElementException("QR de partido no válido");
        return values.getFirst();
    }

    private void validate(CheckInContext value) {
        if (!"JOINED".equals(value.participationStatus())) {
            throw new ReservationConflictException("El jugador no tiene un cupo confirmado");
        }
        if (value.checkedInAt() == null && !clock.instant().isBefore(value.validUntil())) {
            throw new ReservationConflictException("El QR del partido venció");
        }
    }

    private static CheckInPlayer view(CheckInContext value) {
        return new CheckInPlayer(
                value.matchId(),
                value.participantId(),
                value.playerName(),
                value.playerEmail(),
                value.avatarUrl(),
                value.participationStatus(),
                value.paymentStatus(),
                value.paidMinor(),
                value.currency(),
                value.checkedInAt());
    }

    private static String extractToken(String payload) {
        if (payload == null) throw new IllegalArgumentException("El QR es obligatorio");
        var value = payload.trim();
        if (value.startsWith(PAYLOAD_PREFIX)) value = value.substring(PAYLOAD_PREFIX.length());
        if (!value.matches("[A-Za-z0-9_-]{43}"))
            throw new IllegalArgumentException("El QR no tiene un formato válido");
        return value;
    }

    private static String hash(String token) {
        try {
            return HexFormat.of()
                    .formatHex(
                            MessageDigest.getInstance("SHA-256")
                                    .digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 no está disponible", impossible);
        }
    }

    private static String newToken() {
        var bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static Instant instant(java.sql.Timestamp value) {
        return value == null ? null : value.toInstant();
    }

    private record PlayerContext(
            UUID participantId,
            UUID matchId,
            String participationStatus,
            String matchStatus,
            Instant endsAt,
            Instant checkedInAt) {}

    private record CheckInContext(
            UUID matchId,
            UUID participantId,
            String playerName,
            String playerEmail,
            String avatarUrl,
            String participationStatus,
            String paymentStatus,
            long paidMinor,
            String currency,
            Instant endsAt,
            Instant validUntil,
            Instant checkedInAt) {}

    public record MatchPass(
            UUID matchId,
            UUID participantId,
            String payload,
            Instant issuedAt,
            Instant validUntil) {}

    public record CheckInPlayer(
            UUID matchId,
            UUID participantId,
            String playerName,
            String playerEmail,
            String avatarUrl,
            String participationStatus,
            String paymentStatus,
            long paidMinor,
            String currency,
            Instant checkedInAt) {}
}
