package com.pulsopiura.platform.payments.infrastructure.storage;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pulsopiura.platform.payments.application.port.PaymentProofStorage;
import java.io.*;
import java.net.URI;
import java.net.http.*;
import java.security.*;
import java.time.Duration;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** Backend-only access: never returns remote URLs or credentials to the browser. */
@Component
@ConditionalOnProperty(name = "app.payments.proof-storage", havingValue = "supabase")
public class SupabasePaymentProofStorage implements PaymentProofStorage {
    private final URI base;
    private final String secret;
    private final String bucket;
    private final HttpClient client;
    private final ObjectMapper json;

    @org.springframework.beans.factory.annotation.Autowired
    public SupabasePaymentProofStorage(
            @Value("${app.payments.supabase.url:}") String url,
            @Value("${app.payments.supabase.secret-key:}") String secret,
            @Value("${app.payments.supabase.bucket:payment-proofs}") String bucket,
            ObjectMapper json) {
        this(
                url,
                secret,
                bucket,
                json,
                HttpClient.newBuilder()
                        .connectTimeout(Duration.ofSeconds(10))
                        .followRedirects(HttpClient.Redirect.NEVER)
                        .build(),
                false);
    }

    SupabasePaymentProofStorage(
            String url,
            String secret,
            String bucket,
            ObjectMapper json,
            HttpClient client,
            boolean localTest) {
        var uri = URI.create(url);
        boolean local =
                localTest && "http".equals(uri.getScheme()) && "127.0.0.1".equals(uri.getHost());
        if ((!local && !"https".equals(uri.getScheme()))
                || uri.getHost() == null
                || uri.getUserInfo() != null
                || uri.getQuery() != null
                || uri.getFragment() != null
                || !(uri.getPath().isEmpty() || uri.getPath().equals("/")))
            throw new IllegalArgumentException(
                    "Configura SUPABASE_STORAGE_URL con el origen HTTPS del proyecto");
        if (secret == null
                || !secret.startsWith("sb_secret_")
                || secret.contains("\n")
                || secret.contains("\r"))
            throw new IllegalArgumentException(
                    "Configura una clave secreta de servidor para Storage");
        if (bucket == null || !bucket.matches("[a-z0-9][a-z0-9-]{0,62}"))
            throw new IllegalArgumentException("Nombre de bucket privado inválido");
        this.base = URI.create(url.replaceAll("/+$", "") + "/storage/v1/");
        this.secret = secret;
        this.bucket = bucket;
        this.client = client;
        this.json = json;
    }

    @Override
    public StoredProof store(byte[] input) {
        if (input == null || input.length == 0 || input.length > PaymentProofImages.MAX_BYTES)
            throw new IllegalArgumentException("Adjunta una imagen JPG o PNG de hasta 5 MB");
        byte[] png = PaymentProofImages.normalize(input);
        requirePrivateBucket();
        String key = UUID.randomUUID() + ".png";
        try (var response = exchange("object/" + bucket + "/" + key, "POST", png, "image/png")) {
            return new StoredProof(
                    key,
                    HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(png)),
                    png.length);
        } catch (IOException | NoSuchAlgorithmException ex) {
            throw unavailable();
        }
    }

    @Override
    public byte[] read(String key) {
        validateKey(key);
        requirePrivateBucket();
        try (var response =
                exchange("object/authenticated/" + bucket + "/" + key, "GET", null, null)) {
            var bytes = response.readNBytes(PaymentProofImages.MAX_BYTES + 1);
            if (bytes.length > PaymentProofImages.MAX_BYTES) throw unavailable();
            return bytes;
        } catch (IOException ex) {
            throw unavailable();
        }
    }

    @Override
    public void delete(String key) {
        validateKey(key);
        requirePrivateBucket();
        try {
            var body = json.writeValueAsBytes(Map.of("prefixes", List.of(key)));
            try (var response = exchange("object/" + bucket, "DELETE", body, "application/json")) {
                /* idempotent delete */
            }
        } catch (IOException ex) {
            throw unavailable();
        }
    }

    private void requirePrivateBucket() {
        try (var response = exchange("bucket/" + bucket, "GET", null, null)) {
            var bytes = response.readNBytes(65537);
            if (bytes.length > 65536) throw unavailable();
            var info = json.readTree(bytes);
            if (!info.path("public").isBoolean()
                    || info.path("public").asBoolean()
                    || !bucket.equals(info.path("id").asText()))
                throw new IllegalStateException(
                        "El bucket de comprobantes debe existir y ser privado");
        } catch (IOException ex) {
            throw unavailable();
        }
    }

    private InputStream exchange(String path, String method, byte[] body, String contentType) {
        var builder =
                HttpRequest.newBuilder(base.resolve(path))
                        .timeout(Duration.ofSeconds(25))
                        .header("apikey", secret);
        if (contentType != null) builder.header("Content-Type", contentType);
        if (method.equals("POST")) builder.header("x-upsert", "false");
        builder.method(
                method,
                body == null
                        ? HttpRequest.BodyPublishers.noBody()
                        : HttpRequest.BodyPublishers.ofByteArray(body));
        try {
            var response = client.send(builder.build(), HttpResponse.BodyHandlers.ofInputStream());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                response.body().close();
                throw unavailable();
            }
            return response.body();
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw unavailable();
        } catch (IOException ex) {
            throw unavailable();
        }
    }

    private static void validateKey(String key) {
        if (key == null
                || !key.matches(
                        "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.png"))
            throw new IllegalArgumentException("Referencia de comprobante inválida");
    }

    private static IllegalStateException unavailable() {
        return new IllegalStateException(
                "No se pudo acceder al almacenamiento privado de comprobantes; intenta nuevamente");
    }
}
