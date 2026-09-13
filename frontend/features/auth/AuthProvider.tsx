"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { User } from "oidc-client-ts";
import { getUserManager } from "@/lib/oidc";
import { onRejectedToken, safeReturnTo } from "@/lib/auth-session";
import { hasRealmRole } from "@/lib/auth-roles";
import { apiRequest } from "@/lib/api";

type AccountPresentation = {
  avatarUrl: string | null;
};

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (google?: boolean, returnTo?: string) => Promise<void>;
  logout: () => Promise<void>;
  accessToken: string | null;
  isPlatformAdmin: boolean;
  googleLoginEnabled: boolean;
  avatarUrl: string | null;
  setProfileAvatarUrl: (avatarUrl: string | null) => void;
};
const googleLoginEnabled =
  process.env.NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED === "true";
const AuthContext = createContext<AuthState | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const currentUser = useRef<User | null>(null);
  const renewalInFlight = useRef<Promise<void> | null>(null);
  const redirecting = useRef(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  useEffect(() => {
    const manager = getUserManager();
    let active = true;
    const loaded = (value: User) => {
      if (!active) return;
      currentUser.current = value.expired ? null : value;
      setUser(currentUser.current);
      setLoading(false);
      if (!value.expired) {
        setNotice("");
        const tokenPicture =
          typeof value.profile?.picture === "string"
            ? value.profile.picture
            : null;
        setAvatarUrl(tokenPicture);
        void Promise.all([
          apiRequest<AccountPresentation>("/me", value.access_token),
          apiRequest<AccountPresentation>("/me/profile", value.access_token),
        ])
          .then(([account, profile]) => {
            if (
              !active ||
              currentUser.current?.access_token !== value.access_token
            )
              return;
            setAvatarUrl(profile.avatarUrl || account.avatarUrl || tokenPicture);
          })
          .catch(() => {
            // La sesión puede seguir siendo válida aunque la presentación no cargue.
          });
      }
    };
    const unloaded = () => {
      currentUser.current = null;
      if (active) {
        setUser(null);
        setAvatarUrl(null);
      }
    };
    const endExpiredSession = () => {
      if (!currentUser.current) return;
      unloaded();
      setNotice("Tu sesión terminó. Inicia sesión para continuar.");
      void manager.removeUser();
    };
    const recoverExpiredSession = () => {
      if (!currentUser.current || renewalInFlight.current) return;
      renewalInFlight.current = manager
        .signinSilent()
        .then((renewed) => {
          if (renewed && !renewed.expired) loaded(renewed);
          else endExpiredSession();
        })
        .catch(endExpiredSession)
        .finally(() => {
          renewalInFlight.current = null;
        });
    };
    const expired = () => recoverExpiredSession();
    const renewFailed = () => {
      if (currentUser.current?.expired) recoverExpiredSession();
    };
    const unsubscribe = onRejectedToken((token) => {
      if (currentUser.current?.access_token === token) recoverExpiredSession();
    });
    manager.events.addUserLoaded(loaded);
    manager.events.addUserUnloaded(unloaded);
    manager.events.addAccessTokenExpired(expired);
    manager.events.addSilentRenewError(renewFailed);
    void manager
      .getUser()
      .then((value) => {
        if (active && value) loaded(value);
      })
      .catch(() => {
        if (active)
          setNotice("No pudimos recuperar la sesión. Vuelve a iniciar sesión.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    void manager.clearStaleState().catch(() => {});
    return () => {
      active = false;
      unsubscribe();
      manager.events.removeUserLoaded(loaded);
      manager.events.removeUserUnloaded(unloaded);
      manager.events.removeAccessTokenExpired(expired);
      manager.events.removeSilentRenewError(renewFailed);
    };
  }, []);
  const login = useCallback(async (google = false, returnTo?: string) => {
    if (redirecting.current) return;
    if (google && !googleLoginEnabled) {
      setNotice(
        "El acceso con Google todavía no está configurado en este ambiente.",
      );
      return;
    }
    redirecting.current = true;
    setNotice("");
    try {
      await getUserManager().signinRedirect({
        extraQueryParams: google ? { kc_idp_hint: "google" } : undefined,
        state: {
          returnTo: safeReturnTo(
            returnTo ?? window.location.pathname + window.location.search,
          ),
        },
      });
    } catch {
      setNotice("No pudimos abrir el inicio de sesión. Vuelve a intentarlo.");
    } finally {
      redirecting.current = false;
    }
  }, []);
  const logout = useCallback(async () => {
    try {
      await getUserManager().signoutRedirect();
    } catch {
      setNotice(
        "No pudimos cerrar la sesión del proveedor. Intenta nuevamente.",
      );
    }
  }, []);
  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      accessToken: user && !user.expired ? user.access_token : null,
      isPlatformAdmin: hasRealmRole(user, "PLATFORM_ADMIN"),
      googleLoginEnabled,
      avatarUrl,
      setProfileAvatarUrl: setAvatarUrl,
    }),
    [user, loading, login, logout, avatarUrl],
  );
  return (
    <AuthContext.Provider value={value}>
      {children}
      {notice && (
        <aside className="authSessionNotice" aria-label="Estado de la sesión">
          <p role="status">{notice}</p>
          <button type="button" onClick={() => void login()}>
            Iniciar sesión
          </button>
          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Cerrar aviso de sesión"
          >
            Cerrar
          </button>
        </aside>
      )}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth requiere AuthProvider");
  return value;
}
