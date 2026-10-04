"use client";

import Image from "next/image";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthProvider";
import { VenueAdmin } from "@/features/venues/VenueAdmin";
import { Buildings, UsersThree } from "@phosphor-icons/react";
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
};

type Member = {
  userId: string;
  role: "OWNER" | "ADMIN" | "OPERATOR";
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  principal: boolean;
};

export function OrganizationAdmin({
  organizationId,
}: {
  organizationId: string;
}) {
  const { accessToken, loading: authLoading, login } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [invitationLink, setInvitationLink] = useState<string | null>(null);
  const [removal, setRemoval] = useState<Member | null>(null);
  const [panel, setPanel] = useState<"team" | "operations">("operations");

  const canManageMembers =
    organization?.role === "OWNER" || organization?.role === "ADMIN";

  const fetchData = useCallback(async () => {
    if (!accessToken) throw new Error("Tu sesión venció. Vuelve a ingresar.");
    const currentOrganization = await apiRequest<Organization>(
      `/organizations/${organizationId}`,
      accessToken,
    );
    const currentMembers =
      currentOrganization.role === "OWNER" ||
      currentOrganization.role === "ADMIN"
        ? await apiRequest<Member[]>(
            `/organizations/${organizationId}/staff`,
            accessToken,
          )
        : [];
    return { currentOrganization, currentMembers };
  }, [accessToken, organizationId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchData();
      setOrganization(result.currentOrganization);
      setMembers(result.currentMembers);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar el complejo.",
      );
    } finally {
      setLoading(false);
    }
  }, [fetchData]);

  useEffect(() => {
    if (authLoading) return;
    if (!accessToken) return;
    let active = true;
    void fetchData()
      .then((result) => {
        if (!active) return;
        setOrganization(result.currentOrganization);
        setMembers(result.currentMembers);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "No se pudo cargar el complejo.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [accessToken, authLoading, fetchData]);

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;
    const form = new FormData(event.currentTarget);
    const formElement = event.currentTarget;
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const invitation = await apiRequest<{ id: string }>(
        `/organizations/${organizationId}/invitations`,
        accessToken,
        {
          method: "POST",
          body: JSON.stringify({
            email: form.get("email"),
            role: form.get("role"),
          }),
        },
      );
      setInvitationLink(
        `${window.location.origin}/invitaciones/${invitation.id}`,
      );
      formElement.reset();
      setMessage(
        "Invitación creada. Comparte el acceso con el correo indicado.",
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo invitar.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function revoke(member: Member) {
    if (!accessToken || member.role === "OWNER") return;
    setRemoval(null);
    setError(null);
    try {
      await apiRequest<void>(
        `/organizations/${organizationId}/members/${member.userId}`,
        accessToken,
        { method: "DELETE" },
      );
      setMembers((current) =>
        current.filter((item) => item.userId !== member.userId),
      );
      setMessage("Acceso revocado correctamente.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo revocar.",
      );
    }
  }

  if (authLoading || (accessToken && loading))
    return <div className="notice">Cargando organización…</div>;
  if (!accessToken)
    return (
      <div className="notice">
        <p>Inicia sesión para acceder al panel del complejo.</p>
        <button className="primary borderless" onClick={() => void login()}>
          Ingresar
        </button>
      </div>
    );
  if (error && !organization)
    return (
      <div className="notice errorNotice" role="alert">
        <strong>Acceso no disponible</strong>
        <p>{error}</p>
        <button className="secondary" onClick={() => void load()}>
          Reintentar
        </button>
      </div>
    );
  if (!organization) return null;

  return (
    <>
      <header className="hybridHome complexPanelHero">
        <section className="hybridHero">
        <div className="hybridHeroCarousel" aria-hidden="true"><Image src="/images/venue-football-7.png" alt="" fill sizes="(max-width: 760px) 100vw, 1120px" className="hybridHeroImage active" priority /></div>
        <div className="hybridHeroShade" />
        <div className="hybridHeroContent">
          <p className="prototypeGreeting">PANEL DE TU COMPLEJO · {organizationStatusLabel(organization.status)}</p>
          <h1>{organization.name}</h1>
          <div className="homeModeSwitch complexPanelSwitch" role="group" aria-label="Secciones del complejo">
            <button type="button" className={panel === "team" ? "active" : ""} aria-pressed={panel === "team"} onClick={() => setPanel("team")}><UsersThree size={20} /> Equipo</button>
            <button type="button" className={panel === "operations" ? "active" : ""} aria-pressed={panel === "operations"} onClick={() => setPanel("operations")}><Buildings size={20} /> Operación</button>
          </div>
        </div>
        </section>
      </header>

      {error && (
        <div className="inlineAlert errorNotice" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="inlineAlert successNotice" role="status">
          {message}
        </div>
      )}
      {invitationLink && (
        <div className="invitationShare">
          <label htmlFor="invitation-link">Enlace para compartir</label>
          <div>
            <input id="invitation-link" readOnly value={invitationLink} />
            <button
              className="secondary"
              onClick={() => void navigator.clipboard.writeText(invitationLink)}
            >
              Copiar
            </button>
          </div>
        </div>
      )}

      <div hidden={panel !== "team"}>
      <section className="adminGrid" aria-label="Gestión de accesos">
        <div className="card">
          <p className="eyebrow">EQUIPO</p>
          <h2>Responsables y colaboradores</h2>
          {!canManageMembers ? (
            <p className="muted">Tu rol no permite administrar miembros.</p>
          ) : members.length === 0 ? (
            <p className="muted">Todavía no hay miembros adicionales.</p>
          ) : (
            <ul className="memberList responsibleList">
              {members.map((member) => (
                <li key={member.userId}>
                  <div>
                    <strong>{member.displayName}</strong>
                    <small>{member.email || "Sin correo disponible"}</small>
                    <span className="pill">{member.principal ? "Dueño principal" : organizationRoleLabel(member.role)}</span>
                  </div>
                  {member.role !== "OWNER" && (
                    <button
                      className="dangerButton"
                      onClick={() => setRemoval(member)}
                    >
                      Revocar
                    </button>
                  )}
                  {member.role === "OWNER" && <button className="secondary" disabled title="Los propietarios se gestionan desde la consola de plataforma">Protegido</button>}
                </li>
              ))}
            </ul>
          )}
        </div>

        {removal && <div className="notice" role="alert"><p>¿Revocar el acceso de {removal.displayName} a este complejo?</p><button className="secondary" type="button" onClick={() => setRemoval(null)}>Cancelar</button><button className="secondary" type="button" onClick={() => void revoke(removal)}>Confirmar retiro</button></div>}
        {canManageMembers && (
          <form className="card adminForm" noValidate onSubmit={invite}>
            <p className="eyebrow">NUEVO ACCESO</p>
            <h2>Invitar miembro</h2>
            <label>
              Correo electrónico
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <label>
              Rol
              <select name="role" defaultValue="OPERATOR">
                <option value="OPERATOR">Operador</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </label>
            <button className="primary borderless" disabled={submitting}>
              {submitting ? "Creando invitación…" : "Crear invitación"}
            </button>
          </form>
        )}
      </section>
      </div>
      <div hidden={panel !== "operations"}>
      <VenueAdmin organizationId={organizationId} role={organization.role} />
      </div>
    </>
  );
}
