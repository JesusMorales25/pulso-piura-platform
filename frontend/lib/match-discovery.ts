export function sortUpcomingMatches<T extends { startsAt: string }>(
  matches: T[],
  now: number,
): T[] {
  return matches
    .filter((match) => {
      const startsAt = Date.parse(match.startsAt);
      return Number.isFinite(startsAt) && startsAt > now;
    })
    .slice()
    .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));
}
