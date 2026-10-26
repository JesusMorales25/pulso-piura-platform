"use client";

import styles from "./PlatformRequestsDashboard.module.css";
import {
  ArrowLeft,
  Buildings,
  SoccerBall,
  Prohibit,
  CheckCircle,
  Clock,
  XCircle,
} from "@phosphor-icons/react";
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

const statusLabels = {
  PENDING: "En revisión",
  APPROVED: "Acceso habilitado",
  REJECTED: "Solicitud rechazada",
  REVOKED: "Acceso revocado",
} as const;
const stateIcons = {
  PENDING: Clock,
  APPROVED: CheckCircle,
  REJECTED: XCircle,
  REVOKED: Prohibit,
};

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
      variant="workspace"
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
      <p className={styles.intro}>
        {selectedStatus === "REVOKED"
          ? "Consulta los accesos retirados."
          : "Revisa la información de las solicitudes."}
      </p>
      <div className={styles.list}>
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
            .map((request) => {
              const CapabilityIcon =
                request.capability === "MATCH_ORGANIZER"
                  ? SoccerBall
                  : Buildings;
              const StateIcon = stateIcons[request.status];
              const distinctName =
                request.displayName?.trim() &&
                request.displayName.trim().toLocaleLowerCase() !==
                  request.email?.trim().toLocaleLowerCase();
              return (
                <article className={styles.card} key={request.id}>
                  <span className={styles.badge} data-state={request.status}>
                    <StateIcon aria-hidden="true" />
                    {statusLabels[request.status]}
                  </span>
                  <header className={styles.heading}>
                    <span className={styles.capabilityIcon}>
                      <CapabilityIcon aria-hidden="true" weight="duotone" />
                    </span>
                    <h2>{capabilityLabel[request.capability]}</h2>
                  </header>
                  <div className={styles.identity}>
                    <span className={styles.avatar} aria-hidden="true">
                      {(request.displayName || request.email || "JU")
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                    <div>
                      {distinctName && <strong>{request.displayName}</strong>}
                      <p>{request.email || "Correo no disponible"}</p>
                    </div>
                  </div>
                  {request.status === "REVOKED" && (
                    <p className={styles.explanation}>
                      {request.capability === "MATCH_ORGANIZER"
                        ? "El acceso para organizar partidos fue retirado."
                        : "El acceso para administrar complejos fue retirado."}
                    </p>
                  )}
                  {request.reason && (
                    <div className={styles.reason}>
                      <h3>Solicitud original</h3>
                      <p>{request.reason}</p>
                    </div>
                  )}
                  {request.status === "PENDING" && (
                    <div className={styles.actions}>
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
                    <div className={styles.actions}>
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
              );
            })
        )}
      </div>
      <button
        type="button"
        className={styles.back}
        onClick={() => {
          setSelectedStatus(null);
          onClose?.();
        }}
      >
        <ArrowLeft aria-hidden="true" />
        Volver a solicitudes
      </button>
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
      {!requestsLoading && !message && scopedRequests.length === 0 && (
        <p className="empty">No hay solicitudes de perfil registradas.</p>
      )}
      {requestSheet}
    </main>
  );
}
