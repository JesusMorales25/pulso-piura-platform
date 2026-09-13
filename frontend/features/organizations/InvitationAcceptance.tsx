"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { apiRequest } from "@/lib/api";

type AcceptedMembership = {
  organizationId: string;
  userId: string;
  role: string;
};

export function InvitationAcceptance({
  invitationId,
}: {
  invitationId: string;
}) {
  const { accessToken, loading, login } = useAuth();
  const [membership, setMembership] = useState<AcceptedMembership | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const returnTo = `/invitaciones/${invitationId}`;

  async function accept() {
    if (!accessToken) return;
    setSubmitting(true);
    setError(null);
    try {
      setMembership(
        await apiRequest<AcceptedMembership>(
          `/organizations/invitations/${invitationId}/accept`,
          accessToken,
          { method: "POST" },
        ),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo aceptar la invitación.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="notice">Validando tu sesión…</div>;

  if (membership)
    return (
      <div className="notice successNotice">
        <h2>Ya formas parte del complejo</h2>
        <p>Tu acceso fue activado con el rol {membership.role}.</p>
        <Link className="primary" href={`/admin/${membership.organizationId}`}>
          Abrir panel
        </Link>
      </div>
    );

  if (!accessToken)
    return (
      <div className="notice">
        <h2>Identifica tu cuenta</h2>
        <p>Debes ingresar con el mismo correo al que se envió la invitación.</p>
        <button
          className="primary borderless"
          onClick={() => void login(false, returnTo)}
        >
          Ingresar para continuar
        </button>
      </div>
    );

  return (
    <div className="notice">
      <h2>Aceptar acceso</h2>
      <p>Confirma que deseas unirte a esta organización deportiva.</p>
      {error && (
        <p className="inlineAlert errorNotice" role="alert">
          {error}
        </p>
      )}
      <button
        className="primary borderless"
        disabled={submitting}
        onClick={() => void accept()}
      >
        {submitting ? "Activando acceso…" : "Aceptar invitación"}
      </button>
    </div>
  );
}
