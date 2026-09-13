// Only transient in-memory notifications; tokens are never written to logs or storage.
type RejectedTokenListener = (token: string) => void;
const listeners = new Set<RejectedTokenListener>();

export function onRejectedToken(listener: RejectedTokenListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function rejectToken(token: string) {
  for (const listener of listeners) listener(token);
}

export function safeReturnTo(value: unknown, fallback = "/perfil"): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u0020]/.test(value)
  )
    return fallback;
  try {
    const url = new URL(value, "https://pulso.invalid");
    if (
      url.origin !== "https://pulso.invalid" ||
      url.pathname.startsWith("/auth/")
    )
      return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}

export function postLoginDestination(
  returnTo: unknown,
  onboardingStatus: string | undefined,
): string {
  return onboardingStatus === "COMPLETE" ? safeReturnTo(returnTo) : "/perfil";
}
