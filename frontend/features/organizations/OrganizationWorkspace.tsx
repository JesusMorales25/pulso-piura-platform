"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useUserCapabilities } from "@/features/access/useUserCapabilities";
import { useAuth } from "@/features/auth/AuthProvider";
import { apiRequest } from "@/lib/api";

type Organization = {
  id: string;
  name: string;
  slug: string;
  status: string;
  role: "OWNER" | "ADMIN" | "OPERATOR";
};

export function OrganizationWorkspace() {
  const { accessToken, loading: authLoading, login } = useAuth();
  const { capabilities, loading: capabilitiesLoading } = useUserCapabilities();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganizations = useCallback(async () => {
    if (!accessToken) throw new Error("Tu sesión venció. Vuelve a ingresar.");
    return apiRequest<Organization[]>("/organizations", accessToken);
  }, [accessToken]);

  useEffect(() => {
    if (authLoading || !accessToken) return;
    let active = true;
    void fetchOrganizations()
      .then((result) => {
        if (active) setOrganizations(result);
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
    setCreating(true);
    setError(null);
    try {
      const created = await apiRequest<Organization>(
        "/organizations",
        accessToken,
        {
          method: "POST",
          body: JSON.stringify({ name: values.get("name") }),
        },
      );
      setOrganizations((current) => [...current, created]);
      form.reset();
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
      {error && (
        <div className="inlineAlert errorNotice" role="alert">
          {error}
        </div>
      )}

      <section className="workspaceGrid" aria-label="Organizaciones deportivas">
        <div>
          <div className="sectionTitle workspaceTitle">
            <div>
              <p className="eyebrow">TUS ESPACIOS</p>
              <h2>Organizaciones</h2>
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
                  className="card organizationCard"
                  key={organization.id}
                >
                  <div>
                    <span className="pill">{organization.role}</span>
                    <h3>{organization.name}</h3>
                    <p>{organization.status}</p>
                  </div>
                  <Link className="primary" href={`/admin/${organization.id}`}>
                    Abrir panel
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>

        {capabilities.canManageOrganizations ? (
          <form
            className="card adminForm createOrganization"
            noValidate
            onSubmit={createOrganization}
          >
            <p className="eyebrow">NUEVO COMPLEJO</p>
            <h2>Crear organización</h2>
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
            <button className="primary borderless" disabled={creating}>
              {creating ? "Creando…" : "Crear organización"}
            </button>
          </form>
        ) : (
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
        )}
      </section>
    </>
  );
}
