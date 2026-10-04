"use client";

import Link from "next/link";
import { useState } from "react";
import { MagnifyingGlass, MapPin, ShieldCheck } from "@phosphor-icons/react";
import { belongsToProfile as belongs, filterDirectory, userProfiles as profiles, type PlatformUser, type UserProfile } from "./user-directory";
export type { PlatformUser } from "./user-directory";

export function PlatformUserDirectory({ users }: { users: PlatformUser[] }) {
  const [profile, setProfile] = useState<UserProfile>("Todos");
  const [search, setSearch] = useState("");
  const uniqueUsers = Array.from(new Map(users.map((user) => [user.id, user])).values());
  const visible = filterDirectory(uniqueUsers, profile, search);

  return <section className="platformUsers" aria-labelledby="platform-users-title">
    <div className="sectionTitle"><div><p className="eyebrow">CUENTAS REGISTRADAS</p><h2 id="platform-users-title">Usuarios</h2></div><span className="countBadge">{uniqueUsers.length}</span></div>
    <div className="profileFilterTabs" aria-label="Filtrar por perfil">{profiles.map((item) => <button type="button" key={item} aria-pressed={profile === item} onClick={() => setProfile(item)}>{item}<span>{uniqueUsers.filter((user) => belongs(user, item)).length}</span></button>)}</div>
    <label className="directorySearch"><MagnifyingGlass aria-hidden="true" /><span className="srOnly">Buscar por nombre, correo o distrito</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre, correo o distrito" type="search" />{search && <button aria-label="Limpiar búsqueda" className="secondary" type="button" onClick={() => setSearch("")}>Limpiar</button>}</label>
    <div className="accountDirectoryGrid">{visible.map((user) => <article className="accountDirectoryCard" key={user.id}>
      <header><span className="directoryAvatar" style={user.avatarUrl ? { backgroundImage: `url(${user.avatarUrl})` } : undefined}>{!user.avatarUrl && user.displayName.slice(0, 2).toUpperCase()}</span><div><h3>{user.displayName}</h3><span className={`accountState ${user.status === "ACTIVE" ? "active" : ""}`}>{user.status === "ACTIVE" ? "Activo" : user.status === "SUSPENDED" ? "Suspendido" : "Eliminado"}</span></div></header>
      <p>{user.email || "Sin correo disponible"}</p><p><MapPin aria-hidden="true" size={16} /> {user.districtCode || "Distrito no registrado"}</p>
      <div className="directoryRoles"><span>Jugador</span>{belongs(user, "Organizadores") && <span>Organizador</span>}{belongs(user, "Dueños") && <span>Dueño de cancha</span>}</div>
      <Link className="secondary" href={`/plataforma/solicitudes?user=${encodeURIComponent(user.id)}`}><ShieldCheck /> Gestionar privilegios</Link>
    </article>)}</div>
    {!visible.length && <p className="empty">No hay cuentas que coincidan con este filtro y búsqueda.</p>}
  </section>;
}
