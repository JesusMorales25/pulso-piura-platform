"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Buildings, CalendarCheck } from "@phosphor-icons/react";
import { useUserCapabilities } from "@/features/access/useUserCapabilities";
import { useAuth } from "@/features/auth/AuthProvider";
import { OrganizationReservations } from "./OrganizationReservations";
import { OrganizationSchedule } from "./OrganizationSchedule";

export function VenueOwnerReservationsDashboard() {
  const { accessToken, loading: authLoading, login } = useAuth();
  const { capabilities, memberships, loading: capabilitiesLoading } =
    useUserCapabilities();
  const ownedOrganizations = memberships.filter(
    (membership) => membership.role === "OWNER",
  );
  const [selectedId, setSelectedId] = useState("");
  const [tab, setTab] = useState<"schedule" | "reservations">("schedule");
  const activeId = ownedOrganizations.some(
    (organization) => organization.id === selectedId,
  )
    ? selectedId
    : (ownedOrganizations[0]?.id ?? "");

  if (authLoading || capabilitiesLoading) {
    return <div className="notice">Cargando reservas…</div>;
  }

  if (!accessToken) {
    return (
      <div className="notice">
        <p>Inicia sesión para consultar las reservas de tus canchas.</p>
        <button className="primary borderless" onClick={() => void login()}>
          Ingresar
        </button>
      </div>
    );
  }

  if (!capabilities.isVenueOwner) {
    return (
      <div className="notice errorNotice" role="alert">
        Esta sección está disponible para propietarios de canchas aprobados.
      </div>
    );
  }

  if (ownedOrganizations.length === 0) {
    return (
      <div className="empty ownerReservationsEmpty">
        <Buildings aria-hidden="true" size={34} />
        <h2>Primero registra tu complejo</h2>
        <p>
          Cuando tengas un complejo y sus canchas configuradas, sus reservas
          aparecerán en este panel.
        </p>
        <Link className="primary" href="/organizaciones">
          Ir a Mis canchas
        </Link>
      </div>
    );
  }

  return (
    <>
      <header className="hybridHome complexPanelHero">
        <section className="hybridHero">
        <div className="hybridHeroCarousel" aria-hidden="true"><Image src="/images/venue-football-7.png" alt="" fill sizes="(max-width: 760px) 100vw, 1120px" className="hybridHeroImage active" priority /></div>
        <div className="hybridHeroShade" />
        <div className="hybridHeroContent">
          <p className="prototypeGreeting">CONTROL DE RESERVAS</p>
          <h1>Controla tus reservas</h1>
          <div className="homeModeSwitch complexPanelSwitch" role="group" aria-label="Vista de operación"><button type="button" className={tab === "schedule" ? "active" : ""} aria-pressed={tab === "schedule"} onClick={() => setTab("schedule")}><Buildings size={20} />Malla de canchas</button><button type="button" className={tab === "reservations" ? "active" : ""} aria-pressed={tab === "reservations"} onClick={() => setTab("reservations")}><CalendarCheck size={20} />Reservas y pagos</button></div>
        </div>
        </section>
      </header>

      {ownedOrganizations.length > 1 && (
        <label className="ownerOrganizationPicker">
          Complejo
          <select
            value={activeId}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            {ownedOrganizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {tab === "schedule" ? <OrganizationSchedule key={activeId} organizationId={activeId} /> : <OrganizationReservations key={activeId} organizationId={activeId} />}
    </>
  );
}
