export function filterSpacesBySport<T extends { sportCode: string }>(
  spaces: T[],
  sportCode: string,
) {
  return sportCode
    ? spaces.filter((space) => space.sportCode === sportCode)
    : spaces;
}
