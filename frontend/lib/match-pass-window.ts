export type MatchPassAvailability =
  "scheduled" | "available" | "expired" | "unavailable";

/** The backend is authoritative; this gate keeps unavailable QR actions out of the UI. */
export function matchPassAvailability(
  startsAt: string,
  endsAt: string,
  now: number,
): MatchPassAvailability {
  const start = Date.parse(startsAt),
    end = Date.parse(endsAt);
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    !Number.isFinite(now) ||
    end <= start
  )
    return "unavailable";
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(start));
  const opensAt = Date.parse(day + "T00:00:00-05:00");
  if (now < opensAt) return "scheduled";
  return now < end ? "available" : "expired";
}
