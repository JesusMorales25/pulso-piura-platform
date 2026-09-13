export function whatsappUrl(phone: string | null | undefined) {
  const digits = phone?.replace(/\D/g, "") ?? "";
  return digits.length >= 8 ? `https://wa.me/${digits}` : null;
}

export function googleMapsUrl({
  latitude,
  longitude,
  address,
  mapsUrl,
}: {
  latitude?: number | null;
  longitude?: number | null;
  address: string;
  mapsUrl?: string | null;
}) {
  const directUrl = trustedGoogleMapsUrl(mapsUrl);
  if (directUrl) return directUrl;
  const hasCoordinates =
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    typeof longitude === "number" &&
    Number.isFinite(longitude);
  const query = hasCoordinates ? `${latitude},${longitude}` : address.trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function trustedGoogleMapsUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const trustedHost =
      host === "google.com" ||
      host.endsWith(".google.com") ||
      host === "maps.app.goo.gl" ||
      host === "goo.gl";
    return url.protocol === "https:" && trustedHost ? url.toString() : null;
  } catch {
    return null;
  }
}
