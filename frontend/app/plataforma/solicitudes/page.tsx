"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { apiRequest } from "@/lib/api";
import Link from "next/link";
import { useUserCapabilities } from "@/features/access/useUserCapabilities";

type CapabilityRequest = {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  capability: "MATCH_ORGANIZER" | "VENUE_OWNER";
  status: "PENDING" | "APPROVED" | "REJECTED" | "REVOKED";
  reason: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

const capabilityLabel: Record<CapabilityRequest["capability"], string> = {
  MATCH_ORGANIZER: "Organizador de partidos",
  VENUE_OWNER: "Dueño de cancha",
};

export default function PlatformRequestsPage() {
  const { accessToken, loading, login } = useAuth();
  const { capabilities, loading: capabilitiesLoading } = useUserCapabilities();
  const [requests, setRequests] = useState<CapabilityRequest[]>([]);
  const [message, setMessage] = useState("");
  const [reviewing, setReviewing] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    apiRequest<CapabilityRequest[]>(
      "/platform/capability-requests",
      accessToken,
    )
      .then(setRequests)
      .catch((error: Error) => setMessage(error.message));
  }, [accessToken, capabilities.canManagePlatform]);

  async function review(requestId: string, decision: "APPROVED" | "REJECTED") {
    if (!accessToken) return;
    setReviewing(requestId);
    setMessage("");
    try {
      const updated = await apiRequest<CapabilityRequest>(
        `/platform/capability-requests/${requestId}/review`,
        accessToken,
        {
          method: "POST",
          body: JSON.stringify({ decision }),
        },
      );
      setRequests((current) =>
        current.map((request) => (request.id === updated.id ? updated : request)),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo revisar la solicitud.");
    } finally {
      setReviewing(null);
    }
  }

  async function revoke(requestId: string) {
    if (!accessToken || !capabilities.canManagePlatform) return;
    setReviewing(requestId);
    setMessage("");
    try {
      const updated = await apiRequest<CapabilityRequest>(
        `/platform/capability-requests/${requestId}/revoke`, accessToken,
        { method: "POST", body: JSON.stringify({ note: "Acceso retirado desde la consola de plataforma." }) },
      );
      setRequests((current) => current.map((request) => request.id === updated.id ? updated : request));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo retirar el acceso.");
    } finally {
      setReviewing(null);
    }
  }

  if (loading || capabilitiesLoading)
    return (
      <main className="section">
        <h1>Cargando consola…</h1>
      </main>
    );

  if (!accessToken)
    return (
      <main className="section">
        <p className="eyebrow">PLATAFORMA</p>
        <h1>Inicia sesión para continuar</h1>
        <button className="primary borderless" onClick={() => void login(false)} type="button">
          Iniciar sesión
        </button>
      </main>
    );

  if (!capabilities.canManagePlatform)
    return <main className="section accessDeniedPage"><h1>Acceso restringido</h1><p>Esta sección requiere el rol de administrador de plataforma.</p></main>;

  return (
    <main className="section">
      <p className="eyebrow">ADMINISTRACIÓN DE PLATAFORMA</p>
      <h1>Solicitudes de perfil</h1>
      <Link className="platformBackLink" href="/plataforma">← Volver a la consola</Link>
      <p className="pageLead">
        Revisa solicitudes antes de habilitar capacidades. Cada decisión queda auditada.
      </p>
      {message && (
        <p className="notice" role="alert">
          {message}
        </p>
      )}
      <div className="platformRequestList">
        {requests.length === 0 && !message ? (
          <p className="empty">No hay solicitudes para revisar.</p>
        ) : (
          requests.map((request) => (
            <article className="platformRequestCard" key={request.id}>
              <div>
                <span className="pill">{request.status}</span>
                <h2>{capabilityLabel[request.capability]}</h2>
                <p><strong>{request.displayName}</strong></p>
                <p className="muted">{request.email}</p>
                {request.reason && <p>{request.reason}</p>}
              </div>
              {request.status === "PENDING" && (
                <div className="platformRequestActions">
                  <button
                    className="primary borderless"
                    disabled={reviewing === request.id}
                    onClick={() => void review(request.id, "APPROVED")}
                    type="button"
                  >
                    Aprobar
                  </button>
                  <button
                    className="secondary"
                    disabled={reviewing === request.id}
                    onClick={() => void review(request.id, "REJECTED")}
                    type="button"
                  >
                    Rechazar
                  </button>
                </div>
              )}
              {request.status === "APPROVED" && (
                <div className="platformRequestActions">
                  <button className="secondary" disabled={reviewing === request.id} onClick={() => void revoke(request.id)} type="button">Retirar acceso</button>
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </main>
  );
}
