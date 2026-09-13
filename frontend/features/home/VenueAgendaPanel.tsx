"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Basketball,
  CalendarBlank,
  Lightning,
  MapPin,
  SoccerBall,
  TennisBall,
  Volleyball,
  X,
} from "@phosphor-icons/react";
import type { HomeVenue } from "@/features/home/HomeDashboard";
import { apiRequest } from "@/lib/api";

type Space = { id: string; sportCode: string };
type Slot = { startsAt: string; priceMinor: number; currency: string };
type Availability = { slots: Slot[] };
type VenueAgendaEntry = { slot: Slot | null; sportCode: string };

const toLocalDate = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

export function VenueAgendaPanel({
  loading,
  venues,
}: {
  loading: boolean;
  venues: HomeVenue[];
}) {
  const days = useMemo(
    () =>
      Array.from({ length: 5 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() + index);
        return date;
      }),
    [],
  );
  const [selectedDate, setSelectedDate] = useState(() => toLocalDate(days[0]));
  const [agendaEntries, setAgendaEntries] = useState<
    Record<string, VenueAgendaEntry>
  >({});
  const [lastMinuteVisible, setLastMinuteVisible] = useState(true);
  const dateLabel = new Intl.DateTimeFormat("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${selectedDate}T12:00:00`));

  useEffect(() => {
    let active = true;
    async function loadFirstSlots() {
      const entries = await Promise.all(
        venues.slice(0, 4).map(async (venue) => {
          try {
            const spaces = await apiRequest<Space[]>(
              `/venues/${venue.publicSlug}/spaces`,
            );
            if (!spaces[0]) {
              return [
                venue.publicSlug,
                { slot: null, sportCode: "FOOTBALL" },
              ] as const;
            }
            const availability = await apiRequest<Availability>(
              `/spaces/${spaces[0].id}/bookable-slots?date=${selectedDate}`,
            );
            return [
              venue.publicSlug,
              {
                slot: availability.slots[0] ?? null,
                sportCode: spaces[0].sportCode,
              },
            ] as const;
          } catch {
            return [
              venue.publicSlug,
              { slot: null, sportCode: "FOOTBALL" },
            ] as const;
          }
        }),
      );
      if (active) setAgendaEntries(Object.fromEntries(entries));
    }
    void loadFirstSlots();
    return () => {
      active = false;
    };
  }, [selectedDate, venues]);

  const slotTime = (slot: Slot | null | undefined) =>
    slot
      ? new Intl.DateTimeFormat("es-PE", {
          hour: "numeric",
          minute: "2-digit",
        }).format(new Date(slot.startsAt))
      : "—";
  const slotPrice = (slot: Slot | null | undefined) =>
    slot
      ? new Intl.NumberFormat("es-PE", {
          style: "currency",
          currency: slot.currency,
          maximumFractionDigits: 0,
        }).format(slot.priceMinor / 100)
      : "Consulta disponibilidad";
  const dismissLastMinute = () => {
    setLastMinuteVisible(false);
  };
  const SportIcon = ({ sportCode }: { sportCode: string }) => {
    const Icon =
      sportCode === "VOLLEYBALL"
        ? Volleyball
        : sportCode === "BASKETBALL"
          ? Basketball
          : sportCode === "PADEL" || sportCode === "TENNIS"
            ? TennisBall
            : SoccerBall;
    return <Icon aria-hidden="true" size={34} weight="duotone" />;
  };

  return (
    <section className="venueAgenda" aria-labelledby="venue-agenda-title">
      <div className="agendaHeading">
        <div>
          <p className="eyebrow">RESERVA CON INFORMACIÓN REAL</p>
          <h2 id="venue-agenda-title">Canchas disponibles</h2>
        </div>
        <CalendarBlank aria-hidden="true" size={29} />
      </div>
      <div className="dateStrip" aria-label="Seleccionar fecha">
        {days.map((date, index) => {
          const value = toLocalDate(date);
          return (
            <button
              aria-pressed={selectedDate === value}
              className={selectedDate === value ? "active" : ""}
              key={value}
              onClick={() => setSelectedDate(value)}
              type="button"
            >
              <span>
                {index === 0
                  ? "Hoy"
                  : new Intl.DateTimeFormat("es-PE", {
                      weekday: "short",
                    }).format(date)}
              </span>
              <strong>{date.getDate()}</strong>
            </button>
          );
        })}
        <label className="dateCalendarControl">
          <CalendarBlank aria-hidden="true" size={23} />
          <input
            aria-label="Elegir otra fecha"
            min={toLocalDate(days[0])}
            onChange={(event) => setSelectedDate(event.target.value)}
            type="date"
            value={selectedDate}
          />
        </label>
      </div>
      <p className="agendaDateLabel">{dateLabel}</p>

      {loading ? (
        <div className="agendaSkeleton" aria-label="Cargando complejos" />
      ) : venues.length ? (
        <div className="agendaList">
          {venues.slice(0, 4).map((venue) => {
            const entry = agendaEntries[venue.publicSlug];
            const slot = entry?.slot;
            return (
              <article
                className="agendaVenue"
                id={venue.publicSlug}
                key={venue.publicSlug}
              >
                <div className="agendaTime">
                  <span>Próximo</span>
                  <strong>{slotTime(slot)}</strong>
                  <small>{slot ? "disponible" : "sin turnos"}</small>
                </div>
                <div className="agendaSportIcon">
                  <SportIcon sportCode={entry?.sportCode ?? "FOOTBALL"} />
                </div>
                <div className="agendaVenueCopy">
                  <span>
                    {slot
                      ? "DISPONIBLE EN EL SERVICIO"
                      : "CONSULTA OTROS ESPACIOS"}
                  </span>
                  <h3>{venue.name}</h3>
                  <p>
                    <MapPin aria-hidden="true" size={15} /> {venue.address}
                  </p>
                  <small>{slotPrice(slot)}</small>
                </div>
                <Link
                  className="agendaReserveButton"
                  href={`/canchas?date=${selectedDate}&venue=${venue.publicSlug}`}
                >
                  Reservar
                </Link>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="venueDataEmpty">
          No hay complejos publicados para mostrar.
        </div>
      )}

      {lastMinuteVisible && (
        <aside
          className="agendaLastMinute"
          aria-label="Disponibilidad de última hora"
        >
          <Lightning aria-hidden="true" size={25} weight="fill" />
          <span>
            <strong>ÚLTIMA HORA</strong>
            <small>Consulta canchas disponibles ahora mismo</small>
          </span>
          <Link href="/canchas">Reservar</Link>
          <button
            aria-label="Cerrar aviso de última hora"
            onClick={dismissLastMinute}
            type="button"
          >
            <X aria-hidden="true" size={17} weight="bold" />
          </button>
        </aside>
      )}
    </section>
  );
}
