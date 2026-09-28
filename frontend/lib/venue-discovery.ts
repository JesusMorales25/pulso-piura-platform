export type VenueSummary = {
  districtCode: string;
  amenityCodes?: string[];
};

export type VenueOfferSummary = {
  venue: VenueSummary;
  space: { indoor: boolean; amenityCodes?: string[] };
};

export type VenueFilters = {
  district: string;
  covered: boolean;
  led: boolean;
};

const normalize = (value: string) => value.trim().toLocaleLowerCase("es-PE");

export function districtOptions(venues: VenueSummary[]): string[] {
  const unique = new Map<string, string>();
  for (const venue of venues) {
    const district = venue.districtCode.trim();
    if (district && !unique.has(normalize(district))) {
      unique.set(normalize(district), district);
    }
  }
  return [
    "",
    ...Array.from(unique.values()).sort((left, right) =>
      left.localeCompare(right, "es-PE", { sensitivity: "base" }),
    ),
  ];
}

export function matchesVenueFilters(
  offer: VenueOfferSummary,
  filters: VenueFilters,
): boolean {
  if (
    filters.district &&
    normalize(offer.venue.districtCode) !== normalize(filters.district)
  ) {
    return false;
  }
  if (filters.covered && !offer.space.indoor) return false;
  if (filters.led) {
    const amenities = [
      ...(offer.venue.amenityCodes ?? []),
      ...(offer.space.amenityCodes ?? []),
    ];
    if (!amenities.some((code) => code.toUpperCase() === "LED_LIGHTING")) {
      return false;
    }
  }
  return true;
}
