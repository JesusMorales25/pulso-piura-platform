"use client";

import Link from "next/link";
import { ShieldCheck } from "@phosphor-icons/react";
import { useUserCapabilities } from "@/features/access/useUserCapabilities";
import { MatchBuilder } from "@/features/matches/MatchBuilder";

export default function CreateMatchPage() {
  const { capabilities, loading } = useUserCapabilities();

  if (loading) {
    return (
      <main className="section">
        <div className="notice">Validando tus permisos…</div>
      </main>
    );
  }

  if (!capabilities.canCreateMatches) {
    return (
      <main className="section accessDeniedPage">
        <ShieldCheck aria-hidden="true" size={44} weight="duotone" />
        <p className="eyebrow">ACCESO POR FUNCIONALIDAD</p>
        <h1>Esta opción es para organizadores</h1>
        <p className="pageLead">
          Si ya verificaste tu correo, puedes activar esta función desde tu
          perfil y empezar a publicar pichangas públicas o privadas.
        </p>
        <Link className="primary" href="/perfil#capacidades">
          Activar modo organizador
        </Link>
      </main>
    );
  }

  return <MatchBuilder />;
}
