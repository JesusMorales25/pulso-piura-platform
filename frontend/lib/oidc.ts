"use client";
import { UserManager, WebStorageStateStore } from "oidc-client-ts";
import type { User } from "oidc-client-ts";
let manager: UserManager | undefined;
let callback: Promise<User> | undefined;

const authProvider = process.env.NEXT_PUBLIC_AUTH_PROVIDER ?? "keycloak";
const audience = process.env.NEXT_PUBLIC_OIDC_AUDIENCE;

export function socialLoginParameters(
  google: boolean,
): Record<string, string | number | boolean> | undefined {
  if (!google) return undefined;
  if (authProvider === "auth0") return { connection: "google-oauth2" };
  if (authProvider === "keycloak") return { kc_idp_hint: "google" };
  return undefined;
}

export function completeSignin() {
  // React Strict Mode must not redeem the same authorization code twice.
  callback ??= getUserManager().signinRedirectCallback();
  return callback;
}
export function getUserManager() {
  if (typeof window === "undefined")
    throw new Error("OIDC solo está disponible en el navegador");
  manager ??= new UserManager({
    authority: process.env.NEXT_PUBLIC_OIDC_ISSUER!,
    client_id: process.env.NEXT_PUBLIC_OIDC_CLIENT_ID!,
    redirect_uri: `${window.location.origin}/auth/callback`,
    post_logout_redirect_uri: window.location.origin,
    response_type: "code",
    scope: "openid profile email",
    extraQueryParams: audience ? { audience } : undefined,
    loadUserInfo: false,
    automaticSilentRenew: true,
    accessTokenExpiringNotificationTimeInSeconds: 60,
    validateSubOnSilentRenew: true,
    // Conserva la sesión al recargar esta pestaña, sin persistirla después de
    // cerrar la sesión del navegador, evitando almacenamiento permanente.
    userStore: new WebStorageStateStore({ store: window.sessionStorage }),
    stateStore: new WebStorageStateStore({ store: window.sessionStorage }),
  });
  return manager;
}
