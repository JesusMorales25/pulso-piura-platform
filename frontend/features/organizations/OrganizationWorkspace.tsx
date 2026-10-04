"use client";

import Link from "next/link";
import { DistrictSelect } from "@/components/forms/DistrictSelect";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useUserCapabilities } from "@/features/access/useUserCapabilities";
import { useAuth } from "@/features/auth/AuthProvider";
import { apiRequest } from "@/lib/api";
import { Buildings, MapPin, Plus, ArrowRight } from "@phosphor-icons/react";
import { FloatingNotice } from "@/components/feedback/FloatingNotice";
import {
  organizationRoleLabel,
  organizationStatusLabel,
} from "@/lib/organization-labels";

type Organization = {
  id: string;
  name: string;
  slug: string;
  status: string;
  role: "OWNER" | "ADMIN" | "OPERATOR";
  districtCode: string | null;
  address: string | null;
};

type Overview = { venues: number; spaces: number; members: number; matchesToday: number; reservationsToday: number; expectedMinor: number; locations: string | null };

export function OrganizationWorkspace() {
  const { accessToken, loading: authLoading, login } = useAuth();
  const { capabilities, loading: capabilitiesLoading } = useUserCapabilities();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overviews, setOverviews] = useState<Record<string, Overview>>({});
  const [showCreate, setShowCreate] = useState(false);
  const createDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (showCreate && createDialog.current && !createDialog.current.open) {
      createDialog.current.showModal();
    }
  }, [showCreate]);

  const fetchOrganizations = useCallback(async () => {
    if (!accessToken) throw new Error("Tu sesión venció. Vuelve a ingresar.");
    return apiRequest<Organization[]>("/organizations", accessToken);
  }, [accessToken]);

  useEffect(() => {
    if (authLoading || !accessToken) return;
    let active = true;
    void fetchOrganizations()
      .then((result) => {
        if (active) { setOrganizations(result); if (new URLSearchParams(window.location.search).get("create") === "1") setShowCreate(true); }
        return Promise.all(result.map(async (organization) => {
          const overview = await apiRequest<Overview>(`/organizations/${organization.id}/overview`, accessToken);
          return [organization.id, overview] as const;
        })).then((entries) => { if (active) setOverviews(Object.fromEntries(entries)); });
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "No se pudieron cargar tus organizaciones.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [accessToken, authLoading, fetchOrganizations]);

  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    if (!["name", "districtCode", "address"].every((field) => String(values.get(field) || "").trim())) {
      setError("Completa el nombre, distrito y dirección del complejo.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const created = await apiRequest<Organization>(
        "/organizations",
        accessToken,
        {
          method: "POST",
          body: JSON.stringify({ name: values.get("name"), districtCode: values.get("districtCode"), address: values.get("address") }),
        },
      );
      setOrganizations((current) => [...current, created]);
      form.reset();
      setShowCreate(false);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo crear la organización.",
      );
    } finally {
      setCreating(false);
    }
  }

  if (authLoading || capabilitiesLoading || (accessToken && loading))
    return <div className="notice">Cargando tus organizaciones…</div>;

  if (!accessToken)
    return (
      <div className="notice">
        <h2>Administra tu complejo deportivo</h2>
        <p>
          Inicia sesión para crear una organización o acceder a una invitación.
        </p>
        <button className="primary borderless" onClick={() => void login()}>
          Ingresar
        </button>
      </div>
    );

  return (
    <>
      <header className="ownerWorkspaceHero"><div><p className="eyebrow">MI CANCHA</p><h1>Gestiona tu complejo</h1><p>Configura tus sedes y revisa la operación de hoy.</p></div>{capabilities.canManageOrganizations && <button className="primary borderless" onClick={() => setShowCreate((current) => !current)} type="button"><Plus /> Crear complejo</button>}</header>
      <div className="ownerOverviewMetrics" aria-label="Resumen de complejos">
        {[["Complejos", organizations.length], ["Canchas habilitadas", Object.values(overviews).reduce((sum, item) => sum + item.spaces, 0)], ["Partidos hoy", Object.values(overviews).reduce((sum, item) => sum + item.matchesToday, 0)], ["Recaudación estimada hoy", new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(Object.values(overviews).reduce((sum, item) => sum + item.expectedMinor, 0) / 100)]].map(([label, value]) => <article key={label}><small>{label}</small><strong>{Object.keys(overviews).length === organizations.length ? value : "—"}</strong></article>)}
      </div>
      <p className="muted">Estimación basada en las reservas confirmadas de hoy; no equivale a dinero cobrado.</p>

      <section className="workspaceGrid ownerComplexWorkspace" aria-label="Organizaciones deportivas">
        <div>
          <div className="sectionTitle workspaceTitle">
            <div>
              <p className="eyebrow">TUS ESPACIOS</p>
              <h2>Mis complejos</h2>
            </div>
            <span className="countBadge">{organizations.length}</span>
          </div>

          {organizations.length === 0 ? (
            <div className="empty compactEmpty">
              <h3>Crea tu primer complejo</h3>
              <p>
                Aquí podrás configurar el equipo, las canchas y su operación.
              </p>
            </div>
          ) : (
            <div className="organizationList">
              {organizations.map((organization) => (
                <article
                  className="card organizationCard ownerComplexCard"
                  key={organization.id}
                >
                  <div>
                    <span className="pill">
                      {organizationRoleLabel(organization.role)}
                    </span>
                    <span className="ownerComplexVisual" aria-hidden="true"><Buildings size={38} /></span>
                    <h3>{organization.name}</h3>
                    <p><MapPin size={16} /> {organization.address || overviews[organization.id]?.locations || "Ubicación pendiente de configurar"}{organization.districtCode ? ` · ${organization.districtCode}` : ""}</p>
                    <p>{organizationStatusLabel(organization.status)}</p>
                    <div className="ownerComplexFacts"><span>{overviews[organization.id]?.spaces ?? "—"} canchas habilitadas</span><span>{overviews[organization.id]?.members ?? "—"} colaboradores</span><span>{overviews[organization.id]?.reservationsToday ?? "—"} reservas hoy</span></div>
                  </div>
                  <Link className="primary" href={`/admin/${organization.id}`}>
                    Abrir panel <ArrowRight />
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>

        {capabilities.canManageOrganizations && showCreate ? (
          <dialog ref={createDialog} className="createComplexDialog" aria-labelledby="create-complex-title" onCancel={() => setShowCreate(false)} onClose={() => setShowCreate(false)}>
          <form
            className="card adminForm createOrganization"
            noValidate
            onSubmit={createOrganization}
          >
            <p className="eyebrow">NUEVO COMPLEJO</p>
            <div className="createComplexDialogHeading"><h2 id="create-complex-title">Crear complejo</h2><button type="button" className="secondary" aria-label="Cerrar formulario" onClick={() => setShowCreate(false)}>×</button></div>
            <p className="muted">
              Serás propietario y podrás invitar administradores u operadores.
            </p>
            <label>
              Nombre comercial
              <input
                name="name"
                maxLength={160}
                placeholder="Ej. Arena Norte"
                autoComplete="organization"
                required
              />
            </label>
            <DistrictSelect />
            <label>Dirección de la sede<input name="address" maxLength={240} placeholder="Av. y número o referencia de ubicación" autoComplete="street-address" required /></label>
            {error && <p className="errorNotice" role="alert">{error}</p>}
            <button className="primary borderless" disabled={creating}>
              {creating ? "Creando…" : "Crear complejo"}
            </button>
            <button type="button" className="secondary" disabled={creating} onClick={() => setShowCreate(false)}>Cancelar</button>
          </form>
          </dialog>
        ) : !capabilities.canManageOrganizations ? (
          <aside className="card adminForm createOrganization">
            <p className="eyebrow">ACCESO PARA PROPIETARIOS</p>
            <h2>Publica tu complejo</h2>
            <p className="muted">
              Envía tu solicitud desde el perfil. Cuando la plataforma la
              apruebe, podrás crear y configurar tus sedes y canchas.
            </p>
            <Link className="primary" href="/perfil">
              Ir a mi perfil
            </Link>
          </aside>
        ) : null}
      </section>
      <FloatingNotice message={error || ""} tone="error" onDismiss={() => setError(null)} />
    </>
  );
}
