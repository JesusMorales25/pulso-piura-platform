"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthProvider";
import { VenueAdmin } from "@/features/venues/VenueAdmin";
import { OrganizationReservations } from "@/features/reservations/OrganizationReservations";

type Organization = {
  id: string;
  name: string;
  slug: string;
  status: string;
  role: "OWNER" | "ADMIN" | "OPERATOR";
};

type Member = {
  organizationId: string;
  userId: string;
  role: "OWNER" | "ADMIN" | "OPERATOR";
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
            `/organizations/${organizationId}/members`,
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
      event.currentTarget.reset();
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
    if (!window.confirm("¿Revocar el acceso de este miembro?")) return;
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
      <div className="adminHead">
        <div>
          <p className="eyebrow">PANEL DEL COMPLEJO</p>
          <h1>{organization.name}</h1>
          <p className="muted">Rol actual: {organization.role}</p>
        </div>
        <span className="pill">{organization.status}</span>
      </div>

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

      <section className="adminGrid" aria-label="Gestión de accesos">
        <div className="card">
          <p className="eyebrow">EQUIPO</p>
          <h2>Miembros activos</h2>
          {!canManageMembers ? (
            <p className="muted">Tu rol no permite administrar miembros.</p>
          ) : members.length === 0 ? (
            <p className="muted">Todavía no hay miembros adicionales.</p>
          ) : (
            <ul className="memberList">
              {members.map((member) => (
                <li key={member.userId}>
                  <div>
                    <strong>{member.role}</strong>
                    <small>{member.userId}</small>
                  </div>
                  {member.role !== "OWNER" && (
                    <button
                      className="dangerButton"
                      onClick={() => void revoke(member)}
                    >
                      Revocar
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

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

      <VenueAdmin organizationId={organizationId} role={organization.role} />
      {organization.role === "OWNER" && (
        <OrganizationReservations organizationId={organizationId} />
      )}
    </>
  );
}
