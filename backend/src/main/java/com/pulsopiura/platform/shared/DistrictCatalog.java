package com.pulsopiura.platform.shared;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;

/** Official districts of the province of Piura; neighborhoods belong in the address. */
public final class DistrictCatalog {
    public static final List<String> NAMES =
            List.of(
                    "Castilla",
                    "Catacaos",
                    "Cura Mori",
                    "El Tallán",
                    "La Arena",
                    "La Unión",
                    "Las Lomas",
                    "Piura",
                    "Tambogrande",
                    "Veintiséis de Octubre");

    private DistrictCatalog() {}

    public static String canonical(String value) {
        if (value == null) return null;
        var key = key(value);
        if (key.equals("26 de octubre")) key = "veintiseis de octubre";
        if (key.equals("tambo grande")) key = "tambogrande";
        if (key.equals("curamori")) key = "cura mori";
        var normalized = key;
        return NAMES.stream().filter(name -> key(name).equals(normalized)).findFirst().orElse(null);
    }

    public static String require(String value) {
        var result = canonical(value);
        if (result == null)
            throw new IllegalArgumentException(
                    "Selecciona un distrito válido de la provincia de Piura");
        return result;
    }

    public static boolean same(String left, String right) {
        return left != null && right != null && key(left).equals(key(right));
    }

    private static String key(String value) {
        return Normalizer.normalize(value.trim().replaceAll("\\s+", " "), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT);
    }
}
