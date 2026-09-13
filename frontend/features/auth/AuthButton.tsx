"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserCircle } from "@phosphor-icons/react";
import { useAuth } from "./AuthProvider";

export function AuthButton() {
  const router = useRouter();
  const { user, loading, avatarUrl } = useAuth();
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);

  if (loading) return null;

  if (!user) {
    return (
      <button
        aria-label="Iniciar sesión"
        className="login iconLogin"
        onClick={() => router.push("/perfil")}
        type="button"
      >
        <UserCircle aria-hidden="true" size={22} weight="bold" />
        <span className="srOnly">Iniciar sesión</span>
      </button>
    );
  }

  const picture =
    typeof avatarUrl === "string" &&
    (/^https?:\/\//.test(avatarUrl) || avatarUrl.startsWith("/"))
      ? avatarUrl
      : null;

  return (
    <Link
      aria-label="Abrir mi perfil"
      className="login profileAccess"
      href="/perfil"
    >
      {picture && failedImageUrl !== picture ? (
        /* La URL puede proceder del perfil o de un proveedor OIDC autorizado. */
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          alt=""
          className="headerAvatar"
          height={38}
          onError={() => setFailedImageUrl(picture)}
          referrerPolicy="no-referrer"
          src={picture}
          width={38}
        />
      ) : (
        <UserCircle aria-hidden="true" size={30} weight="fill" />
      )}
    </Link>
  );
}
