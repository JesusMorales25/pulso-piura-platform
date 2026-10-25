"use client";

import { useState } from "react";
import Link from "next/link";
import { PlatformHeroImage } from "@/components/PlatformHeroImage";
import {
  ArrowLeft,
  CalendarCheck,
  SoccerBall,
  UsersThree,
} from "@phosphor-icons/react";
import { MyMatchParticipations } from "@/features/matches/MyMatchParticipations";
import { MyReservations } from "@/features/reservations/MyReservations";

type ActivityTab = "matches" | "reservations";

export function ActivityDashboard({
  highlightedReservationId,
  returnToCreate,
}: {
  highlightedReservationId: string;
  returnToCreate: boolean;
}) {
  const [activeTab, setActiveTab] = useState<ActivityTab>(
    highlightedReservationId ? "reservations" : "matches",
  );

  const options = [
    ["matches", "Mis inscripciones", UsersThree],
    ["reservations", "Mis reservas", CalendarCheck],
  ] as const;

  return (
    <section className="activityDashboard">
      {returnToCreate && (
        <aside className="activityReturnToDraft" role="status">
          <SoccerBall aria-hidden="true" size={24} weight="duotone" />
          <p>
            <b>Tu pichanga sigue guardada.</b>
            <span>
              Confirma la reserva y vuelve para seleccionar esta cancha.
            </span>
          </p>
          <Link className="secondary" href="/crear">
            <ArrowLeft aria-hidden="true" size={17} /> Volver a mi pichanga
          </Link>
        </aside>
      )}
      <section className="hybridHero activityUnifiedHero">
        <div className="hybridHeroCarousel" aria-hidden="true">
          <PlatformHeroImage
            slot="activity"
            src={
              activeTab === "matches"
                ? "/images/demo-volleyball.png"
                : "/images/demo-court-night.png"
            }
            alt=""
            fill
            sizes="(max-width: 760px) 100vw, 1120px"
            className="hybridHeroImage active"
            priority
          />
        </div>
        <div className="hybridHeroShade" />
        <div className="hybridHeroContent">
          <p className="prototypeGreeting">Tu próxima jugada</p>
          <h1>
            {activeTab === "matches"
              ? "Tus partidos, a un paso"
              : "Tu cancha te espera"}
          </h1>
          <div
            aria-label="Seleccionar actividad"
            className="homeModeSwitch activityModeSwitch"
            role="tablist"
          >
            {options.map(([value, label, Icon]) => (
              <button
                aria-controls={`activity-panel-${value}`}
                aria-selected={activeTab === value}
                className={activeTab === value ? "active" : ""}
                id={`activity-tab-${value}`}
                key={value}
                onClick={() => setActiveTab(value)}
                role="tab"
                type="button"
              >
                <Icon
                  aria-hidden="true"
                  size={20}
                  weight={activeTab === value ? "fill" : "regular"}
                />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div
        aria-labelledby={`activity-tab-${activeTab}`}
        className="activityTabPanel hybridContent"
        id={`activity-panel-${activeTab}`}
        role="tabpanel"
      >
        {activeTab === "matches" ? (
          <MyMatchParticipations />
        ) : (
          <MyReservations highlightedReservationId={highlightedReservationId} />
        )}
      </div>
    </section>
  );
}
