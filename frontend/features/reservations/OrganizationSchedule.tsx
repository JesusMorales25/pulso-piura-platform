"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarBlank, Clock } from "@phosphor-icons/react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthProvider";

type Turn = {
  spaceId: string;
  spaceName: string;
  venueName: string;
  publicSlug: string;
  startsAt: string;
  endsAt: string;
  priceMinor: number;
  state: "FREE" | "RENTED" | "PENDING" | "PAYMENT_REVIEW" | "MAINTENANCE";
  reservationId: string | null;
  customerName: string | null;
  totalMinor: number;
  paidMinor: number;
  reason: string | null;
  bookable: boolean;
};
const labels = {
  FREE: "Libre",
  RENTED: "Alquilado",
  PENDING: "Pendiente de pago",
  PAYMENT_REVIEW: "Pendiente de confirmación de pago",
  MAINTENANCE: "Mantenimiento",
};
const currency = (minor: number) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(
    minor / 100,
  );
const time = (value: string) =>
  new Date(value).toLocaleTimeString("es-PE", {
    timeZone: "America/Lima",
    hour: "numeric",
    minute: "2-digit",
  });
export function OrganizationSchedule({
  organizationId,
}: {
  organizationId: string;
}) {
  const { accessToken } = useAuth();
  const [date, setDate] = useState("");
  const [space, setSpace] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [spaces, setSpaces] = useState<
    Array<{ id: string; name: string; venueName: string }>
  >([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!accessToken) return;
    const controller = new AbortController();
    void apiRequest<Array<{ id: string; name: string }>>(
      `/organizations/${organizationId}/venues`,
      accessToken,
      { signal: controller.signal },
    )
      .then((venues) =>
        Promise.all(
          venues.map(async (venue) => {
            const items = await apiRequest<
              Array<{ id: string; name: string; status: string }>
            >(
              `/organizations/${organizationId}/venues/${venue.id}/spaces`,
              accessToken,
              { signal: controller.signal },
            );
            return items
              .filter((item) => item.status !== "ARCHIVED")
              .map((item) => ({ ...item, venueName: venue.name }));
          }),
        ),
      )
      .then((items) => {
        if (!controller.signal.aborted) setSpaces(items.flat());
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "No se pudieron cargar las canchas.",
          );
      });
    return () => controller.abort();
  }, [accessToken, organizationId]);
  useEffect(() => {
    if (!accessToken) return;
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (space) params.set("spaceId", space);
    void apiRequest<Turn[]>(
      `/organizations/${organizationId}/schedule?${params}`,
      accessToken,
      { signal: controller.signal },
    )
      .then((items) => {
        if (!controller.signal.aborted) {
          setTurns(items);
          setError("");
        }
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "No se pudo cargar la malla.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [accessToken, organizationId, date, space]);

  return (
    <section className="organizationSchedule" aria-labelledby="schedule-title">
      <header className="sectionHeading">
        <div>
          <p className="eyebrow">OPERACIÓN DIARIA</p>
          <h2 id="schedule-title">Malla de canchas</h2>
        </div>
        <CalendarBlank size={25} />
      </header>
      <div className="scheduleControls">
        <label>
          Fecha (opcional)
          <input
            type="date"
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              setLoading(true);
            }}
          />
        </label>
        <label>
          Cancha
          <select
            value={space}
            onChange={(event) => {
              setSpace(event.target.value);
              setLoading(true);
            }}
          >
            <option value="">Todas las canchas</option>
            {spaces.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.venueName}
              </option>
            ))}
          </select>
        </label>
      </div>
      {date ? (
        <button
          className="secondary"
          type="button"
          onClick={() => {
            setDate("");
            setLoading(true);
          }}
        >
          Ver todas las reservas activas
        </button>
      ) : (
        <p className="muted">
          Todas las reservas activas. Selecciona una fecha para ver también los
          turnos libres.
        </p>
      )}
      <div className="scheduleLegend">
        {Object.entries(labels).map(([state, label]) => (
          <span className={`scheduleState ${state}`} key={state}>
            {label}
          </span>
        ))}
      </div>
      {error ? (
        <p className="errorNotice" role="alert">
          {error}
        </p>
      ) : loading ? (
        <p className="notice" role="status">
          Cargando horarios…
        </p>
      ) : !turns.length ? (
        <p className="empty">
          {date
            ? "No hay horarios configurados para esta fecha y selección. Configúralos en Mis canchas."
            : "No hay reservas activas para esta selección."}
        </p>
      ) : (
        <div className="scheduleTurnGrid">
          {turns.map((turn) => {
            const params = new URLSearchParams({
              mode: "venues",
              reserve: "1",
              venue: turn.publicSlug,
              space: turn.spaceId,
              date,
              startsAt: turn.startsAt,
              endsAt: turn.endsAt,
            });
            return (
              <article
                className={`scheduleTurn ${turn.state}`}
                key={`${turn.spaceId}-${turn.startsAt}`}
              >
                <header>
                  <strong>
                    <Clock aria-hidden="true" />
                    {time(turn.startsAt)} – {time(turn.endsAt)}
                  </strong>
                  <span className={`scheduleState ${turn.state}`}>
                    {labels[turn.state]}
                  </span>
                </header>
                {!date && (
                  <p>
                    {new Date(turn.startsAt).toLocaleDateString("es-PE", {
                      timeZone: "America/Lima",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                )}
                <h3>{turn.spaceName}</h3>
                <p>{turn.venueName}</p>
                {turn.customerName && (
                  <p className="scheduleCustomer">{turn.customerName}</p>
                )}
                {turn.reason && <p>{turn.reason}</p>}
                <footer>
                  <span>
                    <small>
                      {turn.reservationId
                        ? "Total de la reserva"
                        : "Precio del turno"}
                    </small>
                    <b>
                      {currency(
                        turn.reservationId ? turn.totalMinor : turn.priceMinor,
                      )}
                    </b>
                  </span>
                  {turn.bookable && (
                    <Link className="primary" href={`/?${params}`}>
                      Alquilar turno
                    </Link>
                  )}
                  {turn.reservationId && (
                    <span>
                      <small>Pagado</small>
                      <b>{currency(turn.paidMinor)}</b>
                    </span>
                  )}
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
