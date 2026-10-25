package com.pulsopiura.platform.shared.media.infrastructure;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import java.awt.image.BufferedImage;
import java.io.*;
import java.net.*;
import java.net.http.HttpClient;
import java.util.*;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.*;

class SupabaseMediaStorageTest {
    HttpServer server;
    SupabaseMediaStorage storage;
    Map<String, byte[]> files;
    boolean publicBucket;
    int status;
    int uploads;

    @BeforeEach
    void setup() throws Exception {
        files = new HashMap<>();
        status = 200;
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext(
                "/storage/v1/",
                exchange -> {
                    assertEquals(
                            "sb_secret_test-only", exchange.getRequestHeaders().getFirst("apikey"));
                    assertNull(exchange.getRequestHeaders().getFirst("Authorization"));
                    var path = exchange.getRequestURI().getPath();
                    byte[] response = "{}".getBytes();
                    if (path.contains("/bucket/"))
                        response =
                                ("{\"id\":\"court-photos\",\"public\":" + publicBucket + "}")
                                        .getBytes();
                    else if (exchange.getRequestMethod().equals("POST")) {
                        uploads++;
                        assertEquals("false", exchange.getRequestHeaders().getFirst("x-upsert"));
                        files.put(
                                path.substring(path.lastIndexOf('/') + 1),
                                exchange.getRequestBody().readAllBytes());
                    } else if (exchange.getRequestMethod().equals("GET"))
                        response = files.get(path.substring(path.lastIndexOf('/') + 1));
                    else if (exchange.getRequestMethod().equals("DELETE")) {
                        var key =
                                new ObjectMapper()
                                        .readTree(exchange.getRequestBody())
                                        .path("prefixes")
                                        .get(0)
                                        .asText();
                        files.remove(key);
                    }
                    exchange.sendResponseHeaders(status, response.length);
                    exchange.getResponseBody().write(response);
                    exchange.close();
                });
        server.start();
        storage =
                new SupabaseMediaStorage(
                        "http://127.0.0.1:" + server.getAddress().getPort(),
                        "sb_secret_test-only",
                        "court-photos",
                        new ObjectMapper(),
                        HttpClient.newHttpClient(),
                        true);
    }

    @AfterEach
    void stop() {
        if (server != null) server.stop(0);
    }

    byte[] image() throws Exception {
        var out = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(20, 20, BufferedImage.TYPE_INT_RGB), "jpg", out);
        return out.toByteArray();
    }

    @Test
    void privateUploadReadDeleteRoundTrip() throws Exception {
        var proof = storage.store(image());
        assertTrue(proof.key().matches("[a-f0-9-]+\\.png"));
        var bytes = storage.read(proof.key());
        assertEquals(proof.size(), bytes.length);
        assertEquals(
                "png",
                javax.imageio.ImageIO.getImageReaders(
                                javax.imageio.ImageIO.createImageInputStream(
                                        new ByteArrayInputStream(bytes)))
                        .next()
                        .getFormatName());
        storage.delete(proof.key());
        storage.delete(proof.key());
        assertTrue(files.isEmpty());
    }

    @Test
    void publicBucketFailsClosed() throws Exception {
        publicBucket = true;
        assertThrows(IllegalStateException.class, () -> storage.store(image()));
        assertEquals(0, uploads);
    }

    @Test
    void invalidImagesAndPathsNeverReachStorage() {
        assertThrows(IllegalArgumentException.class, () -> storage.store(new byte[] {1, 2}));
        assertThrows(IllegalArgumentException.class, () -> storage.read("../secret"));
        assertThrows(IllegalArgumentException.class, () -> storage.delete("../secret"));
        assertEquals(0, uploads);
    }

    @Test
    void storageFailuresDoNotExposeSecrets() throws Exception {
        status = 403;
        var ex = assertThrows(IllegalStateException.class, () -> storage.store(image()));
        assertFalse(ex.toString().contains("sb_secret"));
        assertEquals(0, uploads);
    }

    @Test
    void redirectsAreRejectedWithoutFollowingThem() throws Exception {
        status = 302;
        assertThrows(IllegalStateException.class, () -> storage.store(image()));
        assertEquals(0, uploads);
    }

    @Test
    void oversizedStoredObjectsAreRejected() {
        var key = UUID.randomUUID() + ".png";
        files.put(key, new byte[MediaImages.MAX_BYTES + 1]);
        assertThrows(IllegalStateException.class, () -> storage.read(key));
    }

    @Test
    void rejectsInsecureConfiguration() {
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        new SupabaseMediaStorage(
                                "http://example.com",
                                "sb_secret_test",
                                "court-photos",
                                new ObjectMapper()));
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        new SupabaseMediaStorage(
                                "https://example.com",
                                "sb_publishable_test",
                                "court-photos",
                                new ObjectMapper()));
    }
}
