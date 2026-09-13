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
          Tu cuenta de jugador puede reservar canchas y unirse a partidos. La
          creación y gestión se habilitará cuando tengas una relación de capitán
          u organizador activa.
        </p>
        <Link className="primary" href="/?mode=matches">
          Encontrar un partido
        </Link>
      </main>
    );
  }

  return <MatchBuilder />;
}
