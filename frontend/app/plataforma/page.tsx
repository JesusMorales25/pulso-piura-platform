"use client";

import Link from "next/link";
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

type Summary = {
  activeUsers: number;
  pendingRequests: number;
  organizations: number;
  venues: number;
};

type PlatformUser = {
  id: string;
  displayName: string;
  email: string;
  status: string;
  capabilities: string;
};

export default function PlatformPage() {
  const { accessToken, login } = useAuth();
  const { capabilities, loading } = useUserCapabilities();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [error, setError] = useState("");

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
        if (active) setError(reason instanceof Error ? reason.message : "No se pudo cargar la consola.");
      });
    return () => {
      active = false;
    };
  }, [accessToken, capabilities.canManagePlatform]);

  if (loading) return <main className="section"><p className="notice">Validando acceso…</p></main>;
  if (!accessToken) return <main className="section accessDeniedPage"><h1>Administración de plataforma</h1><button className="primary" onClick={() => void login(false, "/plataforma")}>Iniciar sesión</button></main>;
  if (!capabilities.canManagePlatform) return <main className="section accessDeniedPage"><h1>Acceso restringido</h1><p>Esta consola requiere el rol de administrador de plataforma.</p></main>;

  return (
    <main className="section platformDashboard">
      <p className="eyebrow">PULSO PIURA · CONTROL GLOBAL</p>
      <h1>Administración de plataforma</h1>
      <p className="pageLead">Revisa accesos, usuarios, complejos y el contenido comercial publicado.</p>
      {error && <p className="inlineAlert errorNotice" role="alert">{error}</p>}

      <section className="platformKpis" aria-label="Resumen de plataforma">
        <article><UsersThree size={26}/><span>Usuarios activos</span><strong>{summary?.activeUsers ?? "—"}</strong></article>
        <article><CheckSquareOffset size={26}/><span>Solicitudes pendientes</span><strong>{summary?.pendingRequests ?? "—"}</strong></article>
        <article><Buildings size={26}/><span>Organizaciones</span><strong>{summary?.organizations ?? "—"}</strong></article>
        <article><Storefront size={26}/><span>Sedes publicadas</span><strong>{summary?.venues ?? "—"}</strong></article>
      </section>

      <section className="platformModules" aria-label="Módulos de administración">
        <Link href="/plataforma/solicitudes"><CheckSquareOffset size={30}/><span><strong>Permisos y solicitudes</strong><small>Aprobar o retirar acceso de organizadores y dueños de cancha.</small></span></Link>
        <Link href="/plataforma/organizaciones"><Buildings size={30}/><span><strong>Complejos y dueños</strong><small>Revisar organizaciones y asignar o retirar propietarios.</small></span></Link>
        <Link href="/plataforma/negocios"><Storefront size={30}/><span><strong>Choperías y restaurantes</strong><small>Administrar el directorio que aparece en “El tercer tiempo”.</small></span></Link>
      </section>

      <section className="platformUsers" aria-labelledby="platform-users-title">
        <div className="sectionTitle"><div><p className="eyebrow">CUENTAS REGISTRADAS</p><h2 id="platform-users-title">Usuarios</h2></div><span className="countBadge">{users.length}</span></div>
        <div className="platformUserList">
          {users.map((user) => <article key={user.id}><span><strong>{user.displayName}</strong><small>{user.email}</small></span><div><b>{user.status}</b>{user.capabilities && <small>{user.capabilities}</small>}</div></article>)}
        </div>
      </section>
    </main>
  );
}
