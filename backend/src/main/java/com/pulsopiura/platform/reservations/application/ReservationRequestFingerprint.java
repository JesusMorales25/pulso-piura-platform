package com.pulsopiura.platform.reservations.application;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;

final class ReservationRequestFingerprint {
    private ReservationRequestFingerprint() {}

    static String calculate(UUID sportSpaceId, Instant startsAt, Instant endsAt) {
        var canonical = sportSpaceId + "|" + startsAt + "|" + endsAt;
        try {
            var digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of()
                    .formatHex(digest.digest(canonical.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 no está disponible", impossible);
        }
    }
}
