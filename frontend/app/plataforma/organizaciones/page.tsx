"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Buildings, UserMinus, UserPlus } from "@phosphor-icons/react";
import { useUserCapabilities } from "@/features/access/useUserCapabilities";
import { useAuth } from "@/features/auth/AuthProvider";
import { apiRequest } from "@/lib/api";

type Owner = { userId: string; displayName: string; email: string };
type Organization = { id: string; name: string; slug: string; status: string; owners: Owner[] };

export default function PlatformOrganizationsPage() {
  const { accessToken } = useAuth();
  const { capabilities, loading } = useUserCapabilities();
  const [items, setItems] = useState<Organization[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

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
    setBusy(true); setMessage("");
    try {
      replace(await apiRequest<Organization>(`/platform/organizations/${organizationId}/owners`, accessToken, { method: "POST", body: JSON.stringify({ email }) }));
      form.reset();
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "No se pudo asignar al dueño."); }
    finally { setBusy(false); }
  }

  async function removeOwner(organizationId: string, userId: string) {
    if (!accessToken) return;
    setBusy(true); setMessage("");
    try { replace(await apiRequest<Organization>(`/platform/organizations/${organizationId}/owners/${userId}`, accessToken, { method: "DELETE" })); }
    catch (reason) { setMessage(reason instanceof Error ? reason.message : "No se pudo retirar al dueño."); }
    finally { setBusy(false); }
  }

  if (loading) return <main className="section"><p className="notice">Validando acceso…</p></main>;
  if (!capabilities.canManagePlatform) return <main className="section accessDeniedPage"><h1>Acceso restringido</h1></main>;
  return <main className="section platformOrganizations"><p className="eyebrow">CONTROL DE COMPLEJOS</p><h1>Organizaciones y dueños</h1><Link className="platformBackLink" href="/plataforma">← Volver a la consola</Link><p className="pageLead">Cada complejo conserva al menos un dueño activo. Los cambios administrativos quedan auditados.</p>{message&&<p className="inlineAlert errorNotice" role="alert">{message}</p>}<div className="platformOrganizationList">{items.map((organization)=><article className="card" key={organization.id}><header><Buildings size={30}/><div><span className="pill">{organization.status}</span><h2>{organization.name}</h2></div></header><div className="platformOwnerList">{organization.owners.map((owner)=><div key={owner.userId}><span><strong>{owner.displayName}</strong><small>{owner.email}</small></span><button aria-label={`Retirar a ${owner.displayName}`} className="secondary" disabled={busy||organization.owners.length<=1} onClick={()=>void removeOwner(organization.id,owner.userId)}><UserMinus size={18}/>Retirar</button></div>)}</div><form className="platformOwnerForm" noValidate onSubmit={(event)=>void addOwner(event,organization.id)}><label>Correo del nuevo dueño<input name="email" type="email" required /></label><button className="primary borderless" disabled={busy}><UserPlus size={18}/>Asignar dueño</button></form></article>)}</div></main>;
}
