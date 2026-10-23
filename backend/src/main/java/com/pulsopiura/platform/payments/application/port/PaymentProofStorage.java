package com.pulsopiura.platform.payments.application.port;

/** Private evidence storage; callers must authorize every read and lifecycle operation. */
public interface PaymentProofStorage {
    StoredProof store(byte[] input);

    byte[] read(String key);

    void delete(String key);

    record StoredProof(String key, String sha256, long sizeBytes) {}
}
