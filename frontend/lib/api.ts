import { rejectToken } from "./auth-session";
import { getUserManager } from "./oidc";
const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL!;

export function apiAssetUrl(value: string): string {
  if (!value.startsWith("/api/")) return value;
  try {
    return new URL(value, apiBase).toString();
  } catch {
    return value;
  }
}

let renewal: Promise<string | null> | undefined;
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}
export async function apiRequest<T>(
  path: string,
  accessToken: string | null = null,
  init: RequestInit = {},
): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  const send = (token: string | null) =>
    fetch(`${apiBase}${path}`, {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(15_000),
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.body && !isFormData ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
  let response: Response;
  try {
    response = await send(accessToken);
  } catch (reason) {
    if (init.signal?.aborted) throw reason;
    if (reason instanceof DOMException && reason.name === "TimeoutError") {
      throw new Error(
        "El servicio está tardando demasiado. Intenta nuevamente en unos segundos.",
      );
    }
    throw new Error(
      "No pudimos conectar con el servicio. Verifica que el backend esté iniciado.",
    );
  }
  if (response.status === 401) {
    const renewedToken = await renewForSafeRequest(accessToken, init);
    if (renewedToken) {
      try {
        response = await send(renewedToken);
      } catch (reason) {
        if (init.signal?.aborted) throw reason;
        throw new Error("No pudimos renovar tu sesión. Intenta nuevamente.");
      }
    }
  }
  if (response.status === 401) {
    // A 401 can also come from a temporary proxy or a resource-specific
    // authorization failure. Only discard the local OIDC user when Spring
    // explicitly identifies the bearer token as invalid or expired.
    const authenticationChallenge =
      response.headers.get("WWW-Authenticate") ?? "";
    const rejectedBearerToken = /Bearer\s+[^,]*error=\"?invalid_token\"?/i.test(
      authenticationChallenge,
    );
    if (accessToken && rejectedBearerToken) rejectToken(accessToken);
    throw new ApiError(
      accessToken && rejectedBearerToken
        ? "Tu sesión terminó. Inicia sesión para continuar."
        : "No pudimos validar la reserva en este momento. Conservamos tu sesión para que puedas intentarlo nuevamente.",
      401,
    );
  }
  if (response.status === 403) throw new Error("Tu cuenta no tiene acceso.");
  if (!response.ok) {
    const problem = await response.json().catch(() => null);
    throw new Error(problem?.detail ?? "No se pudo completar la operación.");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function renewForSafeRequest(
  accessToken: string | null,
  init: RequestInit,
): Promise<string | null> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  const canReplay =
    method === "GET" || method === "HEAD" || headers.has("Idempotency-Key");
  if (!accessToken || !canReplay || typeof window === "undefined") return null;
  renewal ??= getUserManager()
    .signinSilent()
    .then((user) => (user && !user.expired ? user.access_token : null))
    .catch(() => null)
    .finally(() => {
      renewal = undefined;
    });
  return renewal;
}
