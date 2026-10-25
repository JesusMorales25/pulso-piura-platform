"use client";

import Link from "next/link";
import styles from "./PlatformUserDirectory.module.css";
import { useState } from "react";
import { FormSheet } from "@/components/forms/FormSheet";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import {
  CaretRight,
  Envelope,
  User,
  UsersThree,
  Buildings,
  SoccerBall,
  MagnifyingGlass,
  MapPin,
  ShieldCheck,
} from "@phosphor-icons/react";
import {
  belongsToProfile as belongs,
  filterDirectory,
  userProfiles as profiles,
  type PlatformUser,
  type UserProfile,
} from "./user-directory";
export type { PlatformUser } from "./user-directory";

export function PlatformUserDirectory({ users }: { users: PlatformUser[] }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [search, setSearch] = useState("");
  const uniqueUsers = Array.from(
    new Map(users.map((user) => [user.id, user])).values(),
  );
  const visible = filterDirectory(uniqueUsers, profile ?? "Todos", search);

  return (
    <section className="platformUsers" aria-labelledby="platform-users-title">
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">CUENTAS REGISTRADAS</p>
          <h2 id="platform-users-title">Usuarios</h2>
        </div>
        <span className="countBadge">{uniqueUsers.length}</span>
      </div>
      <SummaryCards
        items={profiles.map((item) => ({
          id: item,
          label: item,
          value: uniqueUsers.filter((user) => belongs(user, item)).length,
        }))}
        selectedId={profile}
        onSelect={(id) => setProfile(id as UserProfile)}
      />
      {uniqueUsers.length === 0 && (
        <p className="empty">No hay usuarios en esta categoría.</p>
      )}
      <FormSheet
        variant="workspace"
        open={profile !== null}
        title={"Usuarios · " + (profile ?? "Todos")}
        onClose={() => setProfile(null)}
      >
        <div className={styles.directory}>
          <p className={styles.intro}>
            Gestiona los jugadores de tu plataforma.
          </p>
          <label className={styles.search}>
            <MagnifyingGlass aria-hidden="true" />
            <span className="srOnly">
              Buscar por nombre, correo, rol o distrito
            </span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre, correo o rol…"
              type="search"
            />
            {search && (
              <button
                aria-label="Limpiar búsqueda"
                className="secondary"
                type="button"
                onClick={() => setSearch("")}
              >
                Limpiar
              </button>
            )}
          </label>
          <div
            className={styles.filters}
            role="group"
            aria-label="Filtrar usuarios por perfil"
          >
            {profiles
              .filter(
                (item) =>
                  item === profile ||
                  uniqueUsers.some((user) => belongs(user, item)),
              )
              .map((item) => {
                const Icon =
                  item === "Todos"
                    ? UsersThree
                    : item === "Dueños"
                      ? Buildings
                      : item === "Organizadores"
                        ? SoccerBall
                        : User;
                return (
                  <button
                    type="button"
                    key={item}
                    aria-pressed={profile === item}
                    onClick={() => setProfile(item)}
                  >
                    <Icon aria-hidden="true" />
                    <span>{item}</span>
                    <b>
                      {uniqueUsers.filter((user) => belongs(user, item)).length}
                    </b>
                  </button>
                );
              })}
          </div>
          <div className={styles.grid}>
            {visible.map((user) => (
              <article className={styles.card} key={user.id}>
                <header>
                  <span
                    className={styles.avatar}
                    style={
                      user.avatarUrl
                        ? { backgroundImage: `url(${user.avatarUrl})` }
                        : undefined
                    }
                  >
                    {!user.avatarUrl &&
                      user.displayName.slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <h3>{user.displayName}</h3>
                    <div className={styles.badges}>
                      <span className={styles.role}>
                        <User aria-hidden="true" />
                        Jugador
                      </span>
                      <span
                        className={styles.state}
                        data-active={user.status === "ACTIVE"}
                      >
                        {user.status === "ACTIVE"
                          ? "Activo"
                          : user.status === "SUSPENDED"
                            ? "Suspendido"
                            : "Eliminado"}
                      </span>
                    </div>
                  </div>
                </header>
                <div className={styles.contact}>
                  <p>
                    <Envelope aria-hidden="true" />
                    <span>{user.email || "Sin correo disponible"}</span>
                  </p>
                  <p>
                    <MapPin aria-hidden="true" />
                    <span>{user.districtCode || "Distrito no registrado"}</span>
                  </p>
                </div>
                <div className={styles.extraRoles}>
                  {belongs(user, "Organizadores") && <span>Organizador</span>}
                  {belongs(user, "Dueños") && <span>Dueño de cancha</span>}
                </div>
                <Link
                  className={styles.manage}
                  href={`/plataforma/solicitudes?user=${encodeURIComponent(user.id)}`}
                >
                  <ShieldCheck aria-hidden="true" /> Gestionar privilegios
                  <CaretRight aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
          {!visible.length && (
            <p className="empty">
              No hay cuentas que coincidan con este filtro y búsqueda.
            </p>
          )}
        </div>
      </FormSheet>
    </section>
  );
}
