"use client";

import Link from "next/link";
import styles from "./PlatformDashboard.module.css";
import { FormSheet } from "@/components/forms/FormSheet";
import { PlatformRequestsDashboard } from "@/features/organizations/PlatformRequestsDashboard";
import { useEffect, useState } from "react";
import {
  Buildings,
  CheckSquareOffset,
  Storefront,
  UsersThree,
} from "@phosphor-icons/react";
import { useUserCapabilities } from "@/features/access/useUserCapabilities";
import { useAuth } from "@/features/auth/AuthProvider";
import { apiRequest } from "@/lib/api";
import {
  PlatformUserDirectory,
  type PlatformUser,
} from "@/features/organizations/PlatformUserDirectory";

type Summary = {
  activeUsers: number;
  pendingRequests: number;
  organizations: number;
  venues: number;
};

export default function PlatformPage() {
  const { accessToken, login } = useAuth();
  const { capabilities, loading } = useUserCapabilities();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [error, setError] = useState("");
  const [showPending, setShowPending] = useState(false);
  const [showUsers, setShowUsers] = useState(false);

  useEffect(() => {
    if (!accessToken || !capabilities.canManagePlatform) return;
    let active = true;
    void Promise.all([
      apiRequest<Summary>("/platform/summary", accessToken),
      apiRequest<PlatformUser[]>("/platform/users", accessToken),
    ])
      .then(([summaryResult, userResult]) => {
        if (!active) return;
        setSummary(summaryResult);
        setUsers(userResult);
      })
      .catch((reason) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "No se pudo cargar la consola.",
          );
      });
    return () => {
      active = false;
    };
  }, [accessToken, capabilities.canManagePlatform]);

  if (loading)
    return (
      <main className="section">
        <p className="notice">Validando acceso…</p>
      </main>
    );
  if (!accessToken)
    return (
      <main className="section accessDeniedPage">
        <h1>Administración de plataforma</h1>
        <button
          className="primary"
          onClick={() => void login(false, "/plataforma")}
        >
          Iniciar sesión
        </button>
      </main>
    );
  if (!capabilities.canManagePlatform)
    return (
      <main className="section accessDeniedPage">
        <h1>Acceso restringido</h1>
        <p>Esta consola requiere el rol de administrador de plataforma.</p>
      </main>
    );

  return (
    <main className="section platformDashboard">
      <p className="eyebrow">PULSO PIURA · CONTROL GLOBAL</p>
      <h1>Administración de plataforma</h1>
      <p className="pageLead">
        Revisa accesos, usuarios, complejos y el contenido comercial publicado.
      </p>
      {error && (
        <p className="inlineAlert errorNotice" role="alert">
          {error}
        </p>
      )}

      <section
        className={`platformKpis ${styles.kpis}`}
        aria-label="Resumen de plataforma"
      >
        <article>
          <button
            className="secondary"
            type="button"
            onClick={() => setShowUsers(true)}
          >
            <UsersThree size={26} />
            <span>Usuarios activos</span>
            <strong>{summary?.activeUsers ?? "—"}</strong>
          </button>
        </article>
        <article>
          <button
            className="secondary"
            type="button"
            onClick={() => setShowPending(true)}
          >
            <CheckSquareOffset size={26} />
            <span>Solicitudes pendientes</span>
            <strong>{summary?.pendingRequests ?? "—"}</strong>
          </button>
        </article>
        <article>
          <Buildings size={26} />
          <span>Organizaciones</span>
          <strong>{summary?.organizations ?? "—"}</strong>
        </article>
        <article>
          <Storefront size={26} />
          <span>Sedes publicadas</span>
          <strong>{summary?.venues ?? "—"}</strong>
        </article>
      </section>

      <details>
        <summary>Herramientas de administración</summary>
        <section
          className="platformModules"
          aria-label="Módulos de administración"
        >
          <Link href="/plataforma/solicitudes">
            <CheckSquareOffset size={30} />
            <span>
              <strong>Permisos y solicitudes</strong>
              <small>
                Aprobar o retirar acceso de organizadores y dueños de cancha.
              </small>
            </span>
          </Link>
          <Link href="/plataforma/organizaciones">
            <Buildings size={30} />
            <span>
              <strong>Complejos y dueños</strong>
              <small>
                Revisar organizaciones y asignar o retirar propietarios.
              </small>
            </span>
          </Link>
          <Link href="/plataforma/negocios">
            <Storefront size={30} />
            <span>
              <strong>Choperías y restaurantes</strong>
              <small>
                Administrar el directorio que aparece en “El tercer tiempo”.
              </small>
            </span>
          </Link>
        </section>
      </details>
      <FormSheet
        variant="workspace"
        open={showUsers}
        title="Usuarios activos"
        onClose={() => setShowUsers(false)}
      >
        {summary ? (
          <PlatformUserDirectory
            users={users.filter((user) => user.status === "ACTIVE")}
          />
        ) : (
          !error && (
            <p className="notice" role="status">
              Cargando usuarios…
            </p>
          )
        )}
      </FormSheet>
      {showPending && (
        <PlatformRequestsDashboard
          embedded
          onChange={() => {
            void apiRequest<Summary>("/platform/summary", accessToken)
              .then(setSummary)
              .catch((reason: Error) => setError(reason.message));
          }}
          initialStatus="PENDING"
          onClose={() => {
            setShowPending(false);
            void apiRequest<Summary>("/platform/summary", accessToken)
              .then(setSummary)
              .catch((reason: Error) => setError(reason.message));
          }}
        />
      )}
    </main>
  );
}
