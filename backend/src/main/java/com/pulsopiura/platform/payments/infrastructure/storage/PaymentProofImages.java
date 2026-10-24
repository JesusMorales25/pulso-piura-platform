package com.pulsopiura.platform.payments.infrastructure.storage;

import java.awt.image.BufferedImage;
import java.io.*;
import java.util.*;
import javax.imageio.ImageIO;
import javax.imageio.stream.MemoryCacheImageInputStream;

final class PaymentProofImages {
    static final int MAX_BYTES = 5 * 1024 * 1024;

    private PaymentProofImages() {}

    static byte[] normalize(byte[] bytes) {
        try (var input = new MemoryCacheImageInputStream(new ByteArrayInputStream(bytes))) {
            var readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext())
                throw new IllegalArgumentException("El archivo no es una imagen JPG o PNG válida");
            var reader = readers.next();
            try {
                String format = reader.getFormatName().toLowerCase(Locale.ROOT);
                if (!Set.of("png", "jpeg", "jpg").contains(format))
                    throw new IllegalArgumentException("Solo se admite JPG o PNG");
                reader.setInput(input, true, true);
                int width = reader.getWidth(0), height = reader.getHeight(0);
                if (width < 1
                        || height < 1
                        || width > 6000
                        || height > 6000
                        || (long) width * height > 8_000_000) {
                    throw new IllegalArgumentException(
                            "La imagen supera las dimensiones permitidas (8 megapíxeles)");
                }
                var decoded = reader.read(0);
                var clean = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
                var graphics = clean.createGraphics();
                try {
                    graphics.setColor(java.awt.Color.WHITE);
                    graphics.fillRect(0, 0, width, height);
                    graphics.drawImage(decoded, 0, 0, null);
                } finally {
                    graphics.dispose();
                }
                var output = new ByteArrayOutputStream();
                if (!ImageIO.write(clean, "png", output))
                    throw new IOException("PNG writer unavailable");
                if (output.size() > MAX_BYTES)
                    throw new IllegalArgumentException(
                            "La imagen procesada supera 5 MB; reduce su tamaño");
                return output.toByteArray();
            } finally {
                reader.dispose();
            }
        } catch (IOException ex) {
            throw new IllegalArgumentException("No se pudo leer la imagen JPG o PNG", ex);
        }
    }
}
