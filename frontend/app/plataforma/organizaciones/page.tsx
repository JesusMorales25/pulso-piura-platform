"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Buildings, UserMinus, UserPlus } from "@phosphor-icons/react";
import { useUserCapabilities } from "@/features/access/useUserCapabilities";
import { useAuth } from "@/features/auth/AuthProvider";
import { apiRequest } from "@/lib/api";

type Owner = { userId: string; displayName: string; email: string; role: string; principal: boolean };
type Organization = { id: string; name: string; slug: string; status: string; owners: Owner[] };

export default function PlatformOrganizationsPage() {
  const { accessToken } = useAuth();
  const { capabilities, loading } = useUserCapabilities();
  const [items, setItems] = useState<Organization[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [removal, setRemoval] = useState<{ organizationId: string; owner: Owner } | null>(null);

  useEffect(() => {
    if (!accessToken || !capabilities.canManagePlatform) return;
    void apiRequest<Organization[]>("/platform/organizations", accessToken).then(setItems).catch((reason) => setMessage(reason instanceof Error ? reason.message : "No se pudieron cargar los complejos."));
  }, [accessToken, capabilities.canManagePlatform]);

  function replace(updated: Organization) {
    setItems((current) => current.map((item) => item.id === updated.id ? updated : item));
  }

  async function addOwner(event: FormEvent<HTMLFormElement>, organizationId: string) {
    event.preventDefault();
    if (!accessToken) return;
    const form = event.currentTarget;
    const email = new FormData(form).get("email");
    const role = new FormData(form).get("role");
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setMessage("Ingresa un correo válido de una cuenta registrada."); return; }
    setBusy(true); setMessage("");
    try {
      replace(await apiRequest<Organization>(`/platform/organizations/${organizationId}/owners`, accessToken, { method: "POST", body: JSON.stringify({ email, role }) }));
      form.reset();
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "No se pudo asignar al dueño."); }
    finally { setBusy(false); setRemoval(null); }
  }

  async function removeOwner(organizationId: string, userId: string) {
    if (!accessToken) return;
    setBusy(true); setMessage("");
    try { replace(await apiRequest<Organization>(`/platform/organizations/${organizationId}/owners/${userId}`, accessToken, { method: "DELETE" })); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : "No se pudo retirar al dueño."); }
    finally { setBusy(false); setRemoval(null); }
  }

  if (loading) return <main className="section"><p className="notice">Validando acceso…</p></main>;
  if (!capabilities.canManagePlatform) return <main className="section accessDeniedPage"><h1>Acceso restringido</h1></main>;
  return <main className="section platformOrganizations">
    <p className="eyebrow">CONTROL DE COMPLEJOS</p><h1>Dueños y administradores</h1>
    <Link className="platformBackLink" href="/plataforma">← Volver a la consola</Link>
    <p className="pageLead">Cada complejo conserva al menos un dueño activo. Los cambios quedan auditados.</p>
    {message && <p className="inlineAlert errorNotice" role="alert">{message}</p>}
    <div className="platformOrganizationList">{items.map((organization) => <article className="card responsibleOrganizationCard" key={organization.id}>
      <header><Buildings size={30} /><div><span className="pill">{organization.status === "ACTIVE" ? "Activo" : organization.status}</span><h2>{organization.name}</h2></div></header>
      <h3>Responsables autorizados · {organization.owners.length}</h3>
      <div className="platformOwnerList responsibleList">{organization.owners.map((owner) => {
        const protectedOwner = owner.role === "OWNER" && organization.owners.filter((person) => person.role === "OWNER").length <= 1;
        return <div key={owner.userId}><span><strong>{owner.displayName}</strong><small>{owner.email}</small><b className="pill">{owner.principal ? "Dueño principal" : owner.role === "OWNER" ? "Dueño" : "Administrador"}</b></span><button aria-label={`Retirar a ${owner.displayName}`} className="secondary" disabled={busy || protectedOwner} title={protectedOwner ? "Asigna otro dueño antes de retirar al último" : undefined} onClick={() => setRemoval({ organizationId: organization.id, owner })}><UserMinus size={18} />{protectedOwner ? "Protegido" : "Retirar"}</button></div>;
      })}</div>
      {removal?.organizationId === organization.id && <div className="notice" role="alert"><p>¿Retirar el acceso de {removal.owner.displayName} a este complejo?</p><div className="buttonRow"><button className="secondary" type="button" disabled={busy} onClick={() => setRemoval(null)}>Cancelar</button><button className="secondary" type="button" disabled={busy} onClick={() => void removeOwner(organization.id, removal.owner.userId)}>Confirmar retiro</button></div></div>}
      <form className="platformOwnerForm responsibleAssignForm" noValidate onSubmit={(event) => void addOwner(event, organization.id)}>
        <label>Correo del nuevo responsable<input name="email" type="email" autoComplete="email" placeholder="persona@correo.com" required /></label>
        <label>Rol<select name="role" defaultValue="OWNER"><option value="OWNER">Dueño</option><option value="ADMIN">Administrador</option></select></label>
        <button className="primary borderless" disabled={busy}><UserPlus size={18} />Asignar responsable</button>
      </form>
    </article>)}</div>
  </main>;
}
