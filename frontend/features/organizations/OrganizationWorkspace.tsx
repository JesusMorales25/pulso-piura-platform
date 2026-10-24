"use client";

import Link from "next/link";
import Image from "next/image";
import { FormSheet } from "@/components/forms/FormSheet";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
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

type Overview = {
  venues: number;
  spaces: number;
  members: number;
  matchesToday: number;
  reservationsToday: number;
  expectedMinor: number;
  locations: string | null;
};

export function OrganizationWorkspace() {
  const { accessToken, loading: authLoading, login } = useAuth();
  const { capabilities, loading: capabilitiesLoading } = useUserCapabilities();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overviews, setOverviews] = useState<Record<string, Overview>>({});
  const [overviewError, setOverviewError] = useState(false);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewRetry, setOverviewRetry] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [overviewCategory, setOverviewCategory] = useState<string | null>(null);
  const [tab, setTab] = useState<"mine" | "create">("mine");
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
        if (active) {
          setOrganizations(result);
          if (
            new URLSearchParams(window.location.search).get("create") === "1"
          ) {
            setTab("create");
            setShowCreate(true);
          }
        }
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

  useEffect(() => {
    if (!accessToken || organizations.length === 0) return;
    let active = true;
    const controller = new AbortController();
    void Promise.allSettled(
      organizations.map(async (organization) => {
        const overview = await apiRequest<Overview>(
          `/organizations/${organization.id}/overview`,
          accessToken,
          { signal: controller.signal },
        );
        return [organization.id, overview] as const;
      }),
    ).then((results) => {
      if (!active) return;
      setOverviews(
        Object.fromEntries(
          results.flatMap((result) =>
            result.status === "fulfilled" ? [result.value] : [],
          ),
        ),
      );
      setOverviewError(results.some((result) => result.status === "rejected"));
      setOverviewLoading(false);
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [accessToken, organizations, overviewRetry]);

  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    if (
      !["name", "districtCode", "address"].every((field) =>
        String(values.get(field) || "").trim(),
      )
    ) {
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
          body: JSON.stringify({
            name: values.get("name"),
            districtCode: values.get("districtCode"),
            address: values.get("address"),
          }),
        },
      );
      setOrganizations((current) => [...current, created]);
      setTab("mine");
      setOverviewCategory("complexes");
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

  const summaries = organizations.flatMap((organization) =>
    overviews[organization.id] ? [overviews[organization.id]] : [],
  );
  const overviewComplete = summaries.length === organizations.length;
  const filteredOrganizations = organizations.filter((organization) => {
    const overview = overviews[organization.id];
    switch (overviewCategory) {
      case "spaces":
        return !!overview && overview.spaces > 0;
      case "matches":
        return !!overview && overview.matchesToday > 0;
      case "revenue":
        return !!overview && overview.expectedMinor > 0;
      default:
        return true;
    }
  });

  return (
    <>
      <header className="hybridHome complexPanelHero">
        <section className="hybridHero">
          <div className="hybridHeroCarousel" aria-hidden="true">
            <Image
              src="/images/court-reference.svg"
              alt=""
              fill
              sizes="(max-width: 760px) 100vw, 1120px"
              className="hybridHeroImage active"
              priority
            />
          </div>
          <div className="hybridHeroShade" />
          <div className="hybridHeroContent">
            <p className="prototypeGreeting">MI CANCHA</p>
            <h1>Gestiona tu complejo</h1>
            <div
              className="homeModeSwitch complexPanelSwitch"
              role="group"
              aria-label="Gestionar complejos"
            >
              <button
                type="button"
                className={tab === "mine" ? "active" : ""}
                aria-pressed={tab === "mine"}
                onClick={() => setTab("mine")}
              >
                <Buildings size={20} />
                Complejos creados
              </button>
              <button
                type="button"
                className={tab === "create" ? "active" : ""}
                aria-pressed={tab === "create"}
                onClick={() => setTab("create")}
              >
                <Plus size={20} />
                Crear complejos
              </button>
            </div>
          </div>
        </section>
      </header>
      {tab === "mine" ? (
        <>
          <section aria-label="Resumen de complejos">
            <SummaryCards
              selectedId={overviewCategory}
              onSelect={setOverviewCategory}
              items={[
                {
                  id: "complexes",
                  label: "Complejos",
                  value: organizations.length,
                },
                {
                  id: "spaces",
                  label: "Canchas habilitadas",
                  value: overviewComplete
                    ? summaries.reduce((sum, item) => sum + item.spaces, 0)
                    : "—",
                  description: "Ver complejos con canchas",
                },
                {
                  id: "matches",
                  label: "Partidos hoy",
                  value: overviewComplete
                    ? summaries.reduce(
                        (sum, item) => sum + item.matchesToday,
                        0,
                      )
                    : "—",
                  description: "Ver complejos con partidos",
                },
                {
                  id: "revenue",
                  label: "Recaudación estimada hoy",
                  value: overviewComplete
                    ? new Intl.NumberFormat("es-PE", {
                        style: "currency",
                        currency: "PEN",
                      }).format(
                        summaries.reduce(
                          (sum, item) => sum + item.expectedMinor,
                          0,
                        ) / 100,
                      )
                    : "—",
                  description: "No equivale a dinero cobrado",
                },
              ]}
            />
          </section>
          {overviewError && (
            <div className="notice" role="alert">
              <p>
                No se pudo cargar todo el resumen. Tus complejos siguen
                disponibles.
              </p>
              <button
                className="secondary"
                type="button"
                disabled={overviewLoading}
                onClick={() => {
                  setOverviewLoading(true);
                  setOverviewRetry((current) => current + 1);
                }}
              >
                Reintentar resumen
              </button>
            </div>
          )}
          <p className="muted">
            Estimación basada en las reservas confirmadas de hoy; no equivale a
            dinero cobrado.
          </p>

          <FormSheet
            variant="workspace"
            open={overviewCategory !== null}
            title={
              overviewCategory === "spaces"
                ? "Complejos con canchas habilitadas"
                : overviewCategory === "matches"
                  ? "Complejos con partidos hoy"
                  : overviewCategory === "revenue"
                    ? "Recaudación estimada por complejo"
                    : "Mis complejos"
            }
            onClose={() => setOverviewCategory(null)}
          >
            <section
              className="workspaceGrid ownerComplexWorkspace"
              aria-label="Organizaciones deportivas"
            >
              <div>
                <div className="sectionTitle workspaceTitle">
                  <div>
                    <p className="eyebrow">TUS ESPACIOS</p>
                    <h2>Mis complejos</h2>
                  </div>
                  <span className="countBadge">
                    {filteredOrganizations.length}
                  </span>
                </div>

                {organizations.length === 0 ? (
                  <div className="empty compactEmpty">
                    <h3>Crea tu primer complejo</h3>
                    <p>
                      Aquí podrás configurar el equipo, las canchas y su
                      operación.
                    </p>
                  </div>
                ) : (
                  <div className="organizationList">
                    {filteredOrganizations.length === 0 && overviewComplete && (
                      <p className="empty">
                        No hay complejos en esta categoría.
                      </p>
                    )}
                    {filteredOrganizations.map((organization) => (
                      <article
                        className="card organizationCard ownerComplexCard"
                        key={organization.id}
                      >
                        <div>
                          <span className="pill">
                            {organizationRoleLabel(organization.role)}
                          </span>
                          <span
                            className="ownerComplexVisual"
                            aria-hidden="true"
                          >
                            <Buildings size={38} />
                          </span>
                          <h3>{organization.name}</h3>
                          <p>
                            <MapPin size={16} />{" "}
                            {organization.address ||
                              overviews[organization.id]?.locations ||
                              "Ubicación pendiente de configurar"}
                            {organization.districtCode
                              ? ` · ${organization.districtCode}`
                              : ""}
                          </p>
                          <p>{organizationStatusLabel(organization.status)}</p>
                          <div className="ownerComplexFacts">
                            <span>
                              {overviews[organization.id]?.spaces ?? "—"}{" "}
                              canchas habilitadas
                            </span>
                            <span>
                              {overviews[organization.id]?.members ?? "—"}{" "}
                              colaboradores
                            </span>
                            <span>
                              {overviews[organization.id]?.reservationsToday ??
                                "—"}{" "}
                              reservas hoy
                            </span>
                          </div>
                        </div>
                        <Link
                          className="primary"
                          href={`/admin/${organization.id}`}
                        >
                          Abrir panel <ArrowRight />
                        </Link>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>
            {overviewCategory !== "complexes" && !overviewComplete && (
              <p role="status">
                El resumen está incompleto. Cierra esta ventana y reintenta la
                carga.
              </p>
            )}
          </FormSheet>
        </>
      ) : capabilities.canManageOrganizations ? (
        <section className="card matchCreateIntro">
          <p className="eyebrow">NUEVO COMPLEJO</p>
          <h2>Crea tu complejo deportivo</h2>
          <p>
            Registra sus datos y después configura el equipo, las sedes y las
            canchas.
          </p>
          <button
            className="primary"
            type="button"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={20} />
            Crear complejo
          </button>
        </section>
      ) : (
        <p className="notice">
          Solicita el acceso para propietarios desde tu{" "}
          <Link href="/perfil">perfil</Link>.
        </p>
      )}
      {capabilities.canManageOrganizations && showCreate ? (
        <dialog
          ref={createDialog}
          className="createComplexDialog"
          aria-labelledby="create-complex-title"
          onCancel={() => setShowCreate(false)}
          onClose={() => setShowCreate(false)}
        >
          <form
            className="card adminForm createOrganization"
            noValidate
            onSubmit={createOrganization}
          >
            <p className="eyebrow">NUEVO COMPLEJO</p>
            <div className="createComplexDialogHeading">
              <h2 id="create-complex-title">Crear complejo</h2>
              <button
                type="button"
                className="secondary"
                aria-label="Cerrar formulario"
                onClick={() => setShowCreate(false)}
              >
                ×
              </button>
            </div>
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
            <label>
              Dirección de la sede
              <input
                name="address"
                maxLength={240}
                placeholder="Av. y número o referencia de ubicación"
                autoComplete="street-address"
                required
              />
            </label>
            {error && (
              <p className="errorNotice" role="alert">
                {error}
              </p>
            )}
            <button className="primary borderless" disabled={creating}>
              {creating ? "Creando…" : "Crear complejo"}
            </button>
            <button
              type="button"
              className="secondary"
              disabled={creating}
              onClick={() => setShowCreate(false)}
            >
              Cancelar
            </button>
          </form>
        </dialog>
      ) : !capabilities.canManageOrganizations ? (
        <aside className="card adminForm createOrganization">
          <p className="eyebrow">ACCESO PARA PROPIETARIOS</p>
          <h2>Publica tu complejo</h2>
          <p className="muted">
            Envía tu solicitud desde el perfil. Cuando la plataforma la apruebe,
            podrás crear y configurar tus sedes y canchas.
          </p>
          <Link className="primary" href="/perfil">
            Ir a mi perfil
          </Link>
        </aside>
      ) : null}
      <FloatingNotice
        message={error || ""}
        tone="error"
        onDismiss={() => setError(null)}
      />
    </>
  );
}
