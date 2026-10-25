package com.pulsopiura.platform.shared.media.application;

/** Private normalized image objects; keys never come from browser filenames. */
public interface MediaStorage {
    StoredImage store(byte[] input);

    byte[] read(String key);

    void delete(String key);

    record StoredImage(String key, String sha256, long size) {}
}
