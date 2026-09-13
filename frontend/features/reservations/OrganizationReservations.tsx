"use client";
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  money,
  reservationDate,
  reservationTime,
  reservationStatus,
} from "./presentation";
import type { Reservation } from "./types";
import { ReservationCheckInScanner } from "./ReservationCheckInScanner";
type Item = Reservation & {
  spaceName: string;
  venueName: string;
  customerEmail: string | null;
};
type Summary = {
  total: number;
  confirmed: number;
  pending: number;
  cancelled: number;
  paidMinor: number;
  balanceMinor: number;
  retainedMinor: number;
};
function Dashboard({
  organizationId,
  accessToken,
}: {
  organizationId: string;
  accessToken: string;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const inFlight = useRef(false);
  const revision = useRef(0);
  useEffect(() => {
    const controller = new AbortController();
    let timer: number;
    async function load() {
      const started = revision.current;
      try {
        const [result, stats] = await Promise.all([
          apiRequest<{ items: Item[]; total: number }>(
            `/organizations/${organizationId}/reservations?page=${page}&size=20`,
            accessToken,
            { signal: controller.signal },
          ),
          apiRequest<Summary>(
            `/organizations/${organizationId}/reservations/summary`,
            accessToken,
            { signal: controller.signal },
          ),
        ]);
        if (
          !controller.signal.aborted &&
          !inFlight.current &&
          started === revision.current
        ) {
          setItems(result.items);
          setTotal(result.total);
          setSummary(stats);
          setError("");
        }
      } catch (reason) {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "No se pudieron cargar las reservas.",
          );
      } finally {
        if (!controller.signal.aborted)
          timer = window.setTimeout(() => void load(), 8000);
      }
    }
    void load();
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [accessToken, organizationId, page, refresh]);
  async function cancel(id: string) {
    if (inFlight.current) return;
    inFlight.current = true;
    revision.current += 1;
    setBusyId(id);
    setError("");
    try {
      await apiRequest(
        `/organizations/${organizationId}/reservations/${id}/cancel`,
        accessToken,
        {
          method: "POST",
          headers: { "X-Correlation-Id": crypto.randomUUID() },
        },
      );
      setConfirmation(null);
      setRefresh((value) => value + 1);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "No se pudo cancelar.",
      );
    } finally {
      inFlight.current = false;
      setBusyId(null);
    }
  }
  return (
    <section
      className="reservationDashboard"
      aria-labelledby="reservation-dashboard-title"
    >
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">OPERACIÓN</p>
          <h2 id="reservation-dashboard-title">Reservas de tus canchas</h2>
        </div>
        <span className="pill">{total} registradas</span>
      </div>
      <p className="notice">
        Modo de pruebas · No hay cobros reales. Solo puedes cancelar reservas
        sin pagos registrados.
      </p>
      <ReservationCheckInScanner
        organizationId={organizationId}
        accessToken={accessToken}
        onCheckedIn={() => setRefresh((value) => value + 1)}
      />
      {summary && (
        <dl className="reservationMetrics">
          {[
            ["Confirmadas", summary.confirmed],
            ["Pendientes vigentes", summary.pending],
            ["Canceladas", summary.cancelled],
            ["Pagado en pruebas", money(summary.paidMinor)],
            ["Saldo por cobrar", money(summary.balanceMinor)],
            ["Retenido sin devolución", money(summary.retainedMinor)],
          ].map(([label, value]) => (
            <div className="card" key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {error && (
        <p className="inlineAlert errorNotice" role="alert">
          {error}
        </p>
      )}
      {!summary && !error ? (
        <p>Cargando reservas…</p>
      ) : items.length === 0 ? (
        <p className="empty">Todavía no hay reservas.</p>
      ) : (
        <div className="reservationDashboardList">
          {items.map((item) => (
            <article className="card reservationDashboardCard" key={item.id}>
              <div>
                <span className="reservationStatus">
                  {reservationStatus[item.status]}
                </span>
                <h3>{item.spaceName}</h3>
                <p className="muted">{item.venueName}</p>
              </div>
              <p>{reservationDate(item.startsAt)}</p>
              <p>
                {reservationTime(item.startsAt)} –{" "}
                {reservationTime(item.endsAt)}
              </p>
              <p>Cliente: {item.customerEmail ?? "Cliente registrado"}</p>
              <dl className="reservationSummary">
                <div>
                  <dt>Total</dt>
                  <dd>{money(item.totalMinor)}</dd>
                </div>
                <div>
                  <dt>Pagado en pruebas</dt>
                  <dd>{money(item.paidMinor)}</dd>
                </div>
                <div>
                  <dt>
                    {item.status === "CANCELLED"
                      ? "Retenido"
                      : "Saldo pendiente"}
                  </dt>
                  <dd>
                    {money(
                      item.status === "CANCELLED"
                        ? item.paidMinor
                        : Math.max(0, item.totalMinor - item.paidMinor),
                    )}
                  </dd>
                </div>
              </dl>
              {["HOLD", "PENDING_PAYMENT", "CONFIRMED"].includes(item.status) &&
                (item.paidMinor > 0 ? (
                  <p className="muted">
                    Cancelación bloqueada: tiene pagos registrados.
                  </p>
                ) : confirmation === item.id ? (
                  <div>
                    <p>¿Cancelar y liberar este horario?</p>
                    <button
                      className="secondary"
                      disabled={!!busyId}
                      onClick={() => setConfirmation(null)}
                    >
                      Conservar
                    </button>
                    <button
                      className="secondary"
                      disabled={!!busyId}
                      onClick={() => void cancel(item.id)}
                    >
                      {busyId === item.id
                        ? "Cancelando…"
                        : "Confirmar cancelación"}
                    </button>
                  </div>
                ) : (
                  <button
                    className="secondary"
                    disabled={!!busyId}
                    onClick={() => setConfirmation(item.id)}
                  >
                    Cancelar reserva
                  </button>
                ))}
            </article>
          ))}
        </div>
      )}
      <nav className="checkoutActions" aria-label="Páginas de reservas">
        <button
          className="secondary"
          disabled={page === 0}
          onClick={() => setPage(page - 1)}
        >
          Anterior
        </button>
        <span>Página {page + 1}</span>
        <button
          className="secondary"
          disabled={(page + 1) * 20 >= total}
          onClick={() => setPage(page + 1)}
        >
          Siguiente
        </button>
      </nav>
    </section>
  );
}
export function OrganizationReservations({
  organizationId,
}: {
  organizationId: string;
}) {
  const { accessToken } = useAuth();
  if (!accessToken) return <p>Inicia sesión para administrar tus reservas.</p>;
  return (
    <Dashboard
      key={`${organizationId}:${accessToken}`}
      organizationId={organizationId}
      accessToken={accessToken}
    />
  );
}
