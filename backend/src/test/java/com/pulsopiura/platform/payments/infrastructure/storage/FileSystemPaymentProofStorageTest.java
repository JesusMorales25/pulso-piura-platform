package com.pulsopiura.platform.payments.infrastructure.storage;

import static org.junit.jupiter.api.Assertions.*;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class FileSystemPaymentProofStorageTest {
    @TempDir Path directory;

    @Test
    void recodesImageAndKeepsItOutsidePublicPaths() throws Exception {
        var storage = new FileSystemPaymentProofStorage(directory.toString());
        var bytes = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(16, 16, BufferedImage.TYPE_INT_RGB), "jpg", bytes);
        var proof = storage.store(bytes.toByteArray());
        assertTrue(proof.key().matches("[0-9a-f-]{36}\\.png"));
        assertEquals(64, proof.sha256().length());
        var saved = storage.read(proof.key());
        assertEquals(137, saved[0] & 255);
        assertEquals(16, ImageIO.read(new java.io.ByteArrayInputStream(saved)).getWidth());
        assertEquals(saved.length, proof.sizeBytes());
        storage.delete(proof.key());
        assertFalse(Files.exists(directory.resolve(proof.key())));
    }

    @Test
    void rejectsNonImagesOversizedInputsAndPathsOutsideStorage() {
        var storage = new FileSystemPaymentProofStorage(directory.toString());
        assertThrows(IllegalArgumentException.class, () -> storage.store("<svg/>".getBytes()));
        assertThrows(
                IllegalArgumentException.class, () -> storage.store(new byte[5 * 1024 * 1024 + 1]));
        assertThrows(IllegalArgumentException.class, () -> storage.read("../secret.png"));
        assertThrows(IllegalArgumentException.class, () -> storage.delete("/etc/passwd"));
    }

    @Test
    void rejectsOtherImageFormatsAndOversizedDimensionsBeforeDecoding() throws Exception {
        var storage = new FileSystemPaymentProofStorage(directory.toString());
        var image = new BufferedImage(16, 16, BufferedImage.TYPE_INT_RGB);
        var gif = new ByteArrayOutputStream();
        ImageIO.write(image, "gif", gif);
        assertThrows(IllegalArgumentException.class, () -> storage.store(gif.toByteArray()));
        var png = new ByteArrayOutputStream();
        ImageIO.write(image, "png", png);
        var bytes = png.toByteArray();
        java.nio.ByteBuffer.wrap(bytes, 16, 4).putInt(6001);
        assertThrows(IllegalArgumentException.class, () -> storage.store(bytes));
    }

    @Test
    void refusesSymbolicLinkReads() throws Exception {
        var storage = new FileSystemPaymentProofStorage(directory.toString());
        var outside = directory.resolveSibling("outside-proof.txt");
        Files.writeString(outside, "private");
        var key = java.util.UUID.randomUUID() + ".png";
        try {
            Files.createSymbolicLink(directory.resolve(key), outside);
        } catch (java.io.IOException | UnsupportedOperationException ex) {
            org.junit.jupiter.api.Assumptions.abort("OS does not permit symlink creation");
        }
        assertThrows(IllegalArgumentException.class, () -> storage.read(key));
    }

    @Test
    void dropsAppendedExecutableContentAndRejectsTruncatedImages() throws Exception {
        var storage = new FileSystemPaymentProofStorage(directory.toString());
        var output = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB), "png", output);
        byte[] valid = output.toByteArray();
        output.write(
                "<script>alert('payload')</script>"
                        .getBytes(java.nio.charset.StandardCharsets.UTF_8));
        var stored = storage.store(output.toByteArray());
        assertArrayEquals(PaymentProofImages.normalize(valid), storage.read(stored.key()));
        assertThrows(
                IllegalArgumentException.class,
                () -> storage.store(java.util.Arrays.copyOf(valid, 25)));
        assertThrows(
                IllegalArgumentException.class,
                () -> storage.store("MZ executable disguised as receipt.png".getBytes()));
    }
}
