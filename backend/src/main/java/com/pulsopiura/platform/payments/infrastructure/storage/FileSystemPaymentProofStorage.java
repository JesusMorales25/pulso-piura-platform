package com.pulsopiura.platform.payments.infrastructure.storage;

import com.pulsopiura.platform.payments.application.port.PaymentProofStorage;
import java.io.*;
import java.nio.channels.Channels;
import java.nio.file.*;
import java.nio.file.attribute.PosixFilePermissions;
import java.security.MessageDigest;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Images are decoded and re-encoded as PNG; original names and metadata are never retained. */
@Component
public class FileSystemPaymentProofStorage implements PaymentProofStorage {
    private static final int MAX_BYTES = 5 * 1024 * 1024;
    private final Path root;

    public FileSystemPaymentProofStorage(
            @Value("${app.payments.proof-directory:.local/payment-proofs}") String directory) {
        this.root = Path.of(directory).toAbsolutePath().normalize();
    }

    @Override
    public StoredProof store(byte[] input) {
        if (input == null || input.length == 0 || input.length > MAX_BYTES) {
            throw new IllegalArgumentException("Adjunta una imagen JPG o PNG de hasta 5 MB");
        }
        var png = PaymentProofImages.normalize(input);
        Path temporary = null;
        try {
            Files.createDirectories(root);
            if (Files.isSymbolicLink(root))
                throw new IllegalArgumentException("Directorio privado inválido");
            privatePermissions(root, "rwx------");
            temporary = Files.createTempFile(root, ".proof-", ".tmp");
            privatePermissions(temporary, "rw-------");
            Files.write(temporary, png);
            String key = UUID.randomUUID() + ".png";
            Files.move(temporary, resolve(key), StandardCopyOption.ATOMIC_MOVE);
            return new StoredProof(
                    key,
                    HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(png)),
                    png.length);
        } catch (IOException | java.security.NoSuchAlgorithmException ex) {
            throw new IllegalStateException("No se pudo guardar el comprobante privado", ex);
        } finally {
            if (temporary != null) {
                try {
                    Files.deleteIfExists(temporary);
                } catch (IOException ignored) {
                    /* Orphan cleanup may retry. */
                }
            }
        }
    }

    @Override
    public byte[] read(String key) {
        var file = resolve(key);
        if (Files.isSymbolicLink(root) || Files.isSymbolicLink(file)) {
            throw new IllegalArgumentException("Referencia de comprobante inválida");
        }
        try (var channel =
                        Files.newByteChannel(
                                file, StandardOpenOption.READ, LinkOption.NOFOLLOW_LINKS);
                var stream = Channels.newInputStream(channel)) {
            if (channel.size() > MAX_BYTES)
                throw new IllegalArgumentException("Comprobante inválido");
            var bytes = stream.readNBytes(MAX_BYTES + 1);
            if (bytes.length > MAX_BYTES)
                throw new IllegalArgumentException("Comprobante inválido");
            return bytes;
        } catch (NoSuchFileException ex) {
            throw new NoSuchElementException("El comprobante ya no está disponible");
        } catch (IOException ex) {
            throw new IllegalStateException("No se pudo abrir el comprobante privado", ex);
        }
    }

    @Override
    public void delete(String key) {
        var file = resolve(key);
        if (Files.isSymbolicLink(root))
            throw new IllegalArgumentException("Directorio privado inválido");
        try {
            Files.deleteIfExists(file);
        } catch (IOException ex) {
            throw new IllegalStateException("No se pudo retirar el comprobante", ex);
        }
    }

    private Path resolve(String key) {
        if (key == null
                || !key.matches(
                        "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.png")) {
            throw new IllegalArgumentException("Referencia de comprobante inválida");
        }
        return root.resolve(key);
    }

    private void privatePermissions(Path path, String permissions) throws IOException {
        if (Files.getFileStore(path).supportsFileAttributeView("posix")) {
            Files.setPosixFilePermissions(path, PosixFilePermissions.fromString(permissions));
        }
    }
}
