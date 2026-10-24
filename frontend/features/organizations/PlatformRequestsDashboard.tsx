"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { apiRequest } from "@/lib/api";
import Link from "next/link";
import { FormSheet } from "@/components/forms/FormSheet";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
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

const requestStates = [
  { id: "PENDING", label: "Pendientes" },
  { id: "APPROVED", label: "Aprobadas" },
  { id: "REJECTED", label: "Rechazadas" },
  { id: "REVOKED", label: "Revocadas" },
] as const;

const capabilityLabel: Record<CapabilityRequest["capability"], string> = {
  MATCH_ORGANIZER: "Organizador de partidos",
  VENUE_OWNER: "Dueño de cancha",
};

export function PlatformRequestsDashboard({
  initialStatus = null,
  embedded = false,
  onClose,
  onChange,
}: {
  initialStatus?: string | null;
  embedded?: boolean;
  onClose?: () => void;
  onChange?: () => void;
}) {
  const { accessToken, loading, login } = useAuth();
  const { capabilities, loading: capabilitiesLoading } = useUserCapabilities();
  const [requests, setRequests] = useState<CapabilityRequest[]>([]);
  const [message, setMessage] = useState("");
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const [selectedStatus, setSelectedStatus] = useState<string | null>(
    initialStatus,
  );
  const [requestsLoading, setRequestsLoading] = useState(true);
  const scopedRequests = requests.filter(
    (request) => !selectedUser || request.userId === selectedUser,
  );

  useEffect(() => {
    if (!accessToken || !capabilities.canManagePlatform) return;
    apiRequest<CapabilityRequest[]>(
      "/platform/capability-requests",
      accessToken,
    )
      .then((items) => {
        setRequests(items);
        setSelectedUser(
          new URLSearchParams(window.location.search).get("user"),
        );
      })
      .catch((error: Error) => setMessage(error.message))
      .finally(() => setRequestsLoading(false));
  }, [accessToken, capabilities.canManagePlatform]);

  async function review(requestId: string, decision: "APPROVED" | "REJECTED") {
    if (!accessToken || !capabilities.canManagePlatform) return;
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
        current.map((request) =>
          request.id === updated.id ? updated : request,
        ),
      );
      onChange?.();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo revisar la solicitud.",
      );
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
        `/platform/capability-requests/${requestId}/revoke`,
        accessToken,
        {
          method: "POST",
          body: JSON.stringify({
            note: "Acceso retirado desde la consola de plataforma.",
          }),
        },
      );
      setRequests((current) =>
        current.map((request) =>
          request.id === updated.id ? updated : request,
        ),
      );
      onChange?.();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo retirar el acceso.",
      );
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
        <button
          className="primary borderless"
          onClick={() => void login(false)}
          type="button"
        >
          Iniciar sesión
        </button>
      </main>
    );

  if (!capabilities.canManagePlatform)
    return (
      <main className="section accessDeniedPage">
        <h1>Acceso restringido</h1>
        <p>Esta sección requiere el rol de administrador de plataforma.</p>
      </main>
    );

  const requestSheet = (
    <FormSheet
      open={selectedStatus !== null}
      title={
        "Solicitudes · " +
        (requestStates.find((state) => state.id === selectedStatus)?.label ??
          "")
      }
      onClose={() => {
        setSelectedStatus(null);
        onClose?.();
      }}
    >
      {message && (
        <p className="notice" role="alert">
          {message}
        </p>
      )}
      <div className="platformRequestList">
        {requestsLoading ? (
          <p className="notice" role="status">
            Cargando solicitudes…
          </p>
        ) : !scopedRequests.some(
            (request) => request.status === selectedStatus,
          ) ? (
          <p className="empty">No hay solicitudes en este estado.</p>
        ) : (
          scopedRequests
            .filter((request) => request.status === selectedStatus)
            .map((request) => (
              <article className="platformRequestCard" key={request.id}>
                <div>
                  <span className="pill">{request.status}</span>
                  <h2>{capabilityLabel[request.capability]}</h2>
                  <p>
                    <strong>{request.displayName}</strong>
                  </p>
                  <p className="muted">{request.email}</p>
                  {request.reason && <p>{request.reason}</p>}
                </div>
                {request.status === "PENDING" && (
                  <div className="platformRequestActions">
                    <button
                      className="primary borderless"
                      disabled={reviewing !== null}
                      onClick={() => void review(request.id, "APPROVED")}
                      type="button"
                    >
                      Aprobar
                    </button>
                    <button
                      className="secondary"
                      disabled={reviewing !== null}
                      onClick={() => void review(request.id, "REJECTED")}
                      type="button"
                    >
                      Rechazar
                    </button>
                  </div>
                )}
                {request.status === "APPROVED" && (
                  <div className="platformRequestActions">
                    <button
                      className="secondary"
                      disabled={reviewing !== null}
                      onClick={() => void revoke(request.id)}
                      type="button"
                    >
                      Retirar acceso
                    </button>
                  </div>
                )}
              </article>
            ))
        )}
      </div>
    </FormSheet>
  );
  if (embedded) return requestSheet;

  return (
    <main className="section">
      <p className="eyebrow">ADMINISTRACIÓN DE PLATAFORMA</p>
      <h1>Solicitudes de perfil</h1>
      {selectedUser && (
        <p className="notice">
          Gestionando la cuenta seleccionada.{" "}
          <Link href="/plataforma">Ver todas las cuentas</Link>
        </p>
      )}
      <Link className="platformBackLink" href="/plataforma">
        ← Volver a la consola
      </Link>
      <p className="pageLead">
        Revisa solicitudes antes de habilitar capacidades. Cada decisión queda
        auditada.
      </p>
      {message && (
        <p className="notice" role="alert">
          {message}
        </p>
      )}
      {requestsLoading ? (
        <p className="notice" role="status">
          Cargando solicitudes…
        </p>
      ) : (
        <SummaryCards
          items={requestStates.map((state) => ({
            ...state,
            value:
              message && requests.length === 0
                ? "—"
                : scopedRequests.filter(
                    (request) => request.status === state.id,
                  ).length,
          }))}
          selectedId={selectedStatus}
          onSelect={setSelectedStatus}
        />
      )}
      {requestSheet}
    </main>
  );
}
