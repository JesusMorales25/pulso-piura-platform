"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { completeSignin } from "@/lib/oidc";
import { postLoginDestination, safeReturnTo } from "@/lib/auth-session";
import { apiRequest } from "@/lib/api";

type CurrentUser = { onboardingStatus: string };

export default function CallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    completeSignin()
      .then(async (user) => {
        if (!active) return;
        const state = user.state as { returnTo?: unknown } | undefined;
        const returnTo = safeReturnTo(state?.returnTo);
        const destination = await apiRequest<CurrentUser>(
          "/me",
          user.access_token,
        )
          .then((current) =>
            postLoginDestination(returnTo, current.onboardingStatus),
          )
          .catch(() => returnTo);
        if (!active) return;
        window.history.replaceState(null, "", "/auth/callback");
        router.replace(destination);
      })
      .catch(() => {
        if (active) {
          window.history.replaceState(null, "", "/auth/callback");
          setError("No pudimos completar el ingreso. Inténtalo nuevamente.");
        }
      });
    return () => {
      active = false;
    };
  }, [router]);
  return (
    <main className="section">
      <p className="eyebrow">ACCESO SEGURO</p>
      <h1>{error || "Validando tu identidad…"}</h1>
      {error && (
        <Link className="primary" href="/">
          Volver al inicio
        </Link>
      )}
    </main>
  );
}
