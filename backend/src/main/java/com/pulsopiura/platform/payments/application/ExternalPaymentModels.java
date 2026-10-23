package com.pulsopiura.platform.payments.application;

import java.time.Instant;
import java.util.UUID;

public final class ExternalPaymentModels {
    private ExternalPaymentModels() {}

    public enum TargetType {
        MATCH,
        RESERVATION
    }

    public enum Decision {
        CONFIRMED,
        REJECTED,
        CORRECTION_REQUIRED
    }

    public record Preparation(
            long amountMinor, String currency, Instant expiresAt, Destination destination) {}

    public record Destination(
            String holderName,
            String phone,
            boolean yapeEnabled,
            boolean plinEnabled,
            boolean configured) {
        @com.fasterxml.jackson.annotation.JsonProperty("version")
        public String version() {
            try {
                return java.util.HexFormat.of()
                        .formatHex(
                                java.security.MessageDigest.getInstance("SHA-256")
                                        .digest(
                                                (holderName
                                                                + "|"
                                                                + phone
                                                                + "|"
                                                                + yapeEnabled
                                                                + "|"
                                                                + plinEnabled)
                                                        .getBytes(
                                                                java.nio.charset.StandardCharsets
                                                                        .UTF_8)));
            } catch (java.security.NoSuchAlgorithmException impossible) {
                throw new IllegalStateException(impossible);
            }
        }
    }

    public record ProofView(
            UUID id,
            TargetType targetType,
            UUID targetId,
            UUID payerUserId,
            String payerName,
            long amountMinor,
            String currency,
            String method,
            String plan,
            String status,
            String reference,
            String holderName,
            String phone,
            Instant createdAt,
            Instant reviewExpiresAt,
            Instant reviewedAt,
            String reviewNote,
            boolean canReview,
            boolean hasImage) {}

    public record Proof(
            UUID id,
            TargetType targetType,
            UUID targetId,
            UUID receiverId,
            UUID payerUserId,
            String payerName,
            long amountMinor,
            String method,
            String plan,
            String status,
            String reference,
            String holderName,
            String phone,
            String storageKey,
            String sha256,
            long sizeBytes,
            String idempotencyKey,
            UUID ledgerOrderId,
            Instant createdAt,
            Instant reviewExpiresAt,
            Instant reviewedAt,
            String reviewNote) {
        public ProofView view(boolean reviewer) {
            return new ProofView(
                    id,
                    targetType,
                    targetId,
                    payerUserId,
                    payerName,
                    amountMinor,
                    "PEN",
                    method,
                    plan,
                    status,
                    reference,
                    holderName,
                    phone,
                    createdAt,
                    reviewExpiresAt,
                    reviewedAt,
                    reviewNote,
                    reviewer,
                    storageKey != null);
        }
    }
}
