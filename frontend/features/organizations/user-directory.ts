export type PlatformUser = {
  id: string; displayName: string; email: string | null; status: string;
  capabilities: string; avatarUrl: string | null; districtCode: string | null; owner: boolean;
};
export const userProfiles = ["Todos", "Jugadores", "Organizadores", "Dueños"] as const;
export type UserProfile = typeof userProfiles[number];

export function belongsToProfile(user: PlatformUser, profile: UserProfile) {
  if (profile === "Organizadores") return user.capabilities.includes("MATCH_ORGANIZER:APPROVED");
  if (profile === "Dueños") return user.owner || user.capabilities.includes("VENUE_OWNER:APPROVED");
  return true;
}

export function filterDirectory(users: PlatformUser[], profile: UserProfile, search: string) {
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-PE");
  const unique = Array.from(new Map(users.map((user) => [user.id, user])).values());
  return unique.filter((user) => belongsToProfile(user, profile) && normalize(`${user.displayName} ${user.email || ""} ${user.districtCode || ""}`).includes(normalize(search.trim())));
}
