package com.pulsopiura.platform.shared.media.application;

import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** Keeps committed metadata independent from remote object deletion failures. */
@Service
public class MediaObjects {
    private static final org.slf4j.Logger log =
            org.slf4j.LoggerFactory.getLogger(MediaObjects.class);
    private final MediaStorage storage;

    public MediaObjects(MediaStorage storage) {
        this.storage = storage;
    }

    public String create(byte[] bytes) {
        var key = storage.store(bytes).key();
        TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {
                    @Override
                    public void afterCompletion(int status) {
                        if (status != STATUS_COMMITTED) cleanup(key);
                    }
                });
        return key;
    }

    public byte[] read(String key) {
        return storage.read(key);
    }

    public void deleteAfterCommit(String key) {
        TransactionSynchronizationManager.registerSynchronization(
                new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        cleanup(key);
                    }
                });
    }

    private void cleanup(String key) {
        try {
            storage.delete(key);
        } catch (RuntimeException ex) {
            log.warn("Private media object cleanup pending: {}", key);
        }
    }
}
