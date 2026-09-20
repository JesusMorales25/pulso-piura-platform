"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle, EnvelopeSimple, ShieldCheck } from "@phosphor-icons/react";
import { useAuth } from "@/features/auth/AuthProvider";
import { apiRequest } from "@/lib/api";

type Acceptance = {
  invitationId: string;
  publicSlug: string;
  status: "ACCEPTED";
};

export function MatchInvitationAcceptance({ invitationId }: { invitationId: string }) {
  const { accessToken, loading, login, user } = useAuth();
  const [accepted, setAccepted] = useState<Acceptance | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function accept() {
    if (!accessToken) {
      await login(false, `/partidos/invitaciones/${invitationId}`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      setAccepted(
        await apiRequest<Acceptance>(
          `/matches/invitations/${invitationId}/accept`,
          accessToken,
          { method: "POST" },
        ),
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No pudimos aceptar la invitación.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="notice">Validando tu sesión…</p>;
  if (accepted) {
    return (
      <div className="createSuccess">
        <CheckCircle size={44} weight="fill" />
        <h2>Invitación aceptada</h2>
        <p>Ya puedes revisar la pichanga y confirmar tu cupo.</p>
        <Link className="primary" href={`/partidos/${accepted.publicSlug}`}>
          Ver pichanga
        </Link>
      </div>
    );
  }

  return (
    <section className="detailPanel matchInvitationAcceptance">
      <EnvelopeSimple size={38} weight="duotone" />
      <h2>Te invitaron a una pichanga</h2>
      <p>
        La invitación está protegida y solo puede aceptarla el correo al que fue
        enviada.
      </p>
      {typeof user?.profile.email === "string" && (
        <span className="pill">Sesión: {user.profile.email}</span>
      )}
      {error && <p className="inlineAlert errorNotice" role="alert">{error}</p>}
      <button className="primary" disabled={busy} onClick={() => void accept()} type="button">
        <ShieldCheck size={20} />
        {busy ? "Aceptando…" : accessToken ? "Aceptar invitación" : "Ingresar para aceptar"}
      </button>
    </section>
  );
}
