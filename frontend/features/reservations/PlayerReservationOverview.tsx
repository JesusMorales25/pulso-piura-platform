"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { FormSheet } from "@/components/forms/FormSheet";
import { DesktopDrilldown } from "@/components/dashboard/DesktopDrilldown";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import type { Reservation } from "./types";
import {
  money,
  reservationDate,
  reservationTime,
  reservationStatus,
  reservationCount,
} from "./presentation";
import {
  useReservationDashboard,
  reservationFilterLabels,
  type ReservationFilter,
} from "./useReservationDashboard";
import styles from "./ReservationDrilldown.module.css";
export function PlayerReservationOverview({
  accessToken,
  renderDetail,
}: {
  accessToken: string;
  renderDetail: (reservation: Reservation) => ReactNode;
}) {
  const dashboard = useReservationDashboard<Reservation>(
    accessToken,
    "/me/reservations/dashboard",
  );
  const [selected, setSelected] = useState<Reservation | null>(null);
  const choose = (id: string) => {
    setSelected(null);
    dashboard.select(id as ReservationFilter);
  };
  const data = dashboard.data;
  return (
    <section className={styles.overview} aria-label="Resumen de mis reservas">
      <h2>Mis reservas</h2>
      <p className="muted">
        Elige un estado para ver tus reservas y sus pagos.
      </p>
      {dashboard.error && (
        <p role="alert" className="errorNotice">
          {dashboard.error}
          <button className="secondary" onClick={dashboard.refresh}>
            Reintentar
          </button>
        </p>
      )}
      {!data ? (
        <p role="status">Cargando resumen…</p>
      ) : (
        <SummaryCards
          selectedId={dashboard.filter}
          onSelect={choose}
          items={[
            {
              id: "PENDING_PAYMENT_CONFIRMATION",
              label: "Por confirmar pago",
              value: data.counts.pendingConfirmation,
            },
            {
              id: "PENDING_PAYMENT",
              label: "Pendientes de pago",
              value: data.counts.pendingPayment,
            },
            {
              id: "CONFIRMED",
              label: "Confirmadas",
              value: data.counts.confirmed,
            },
            {
              id: "BALANCE",
              label: "Saldo pendiente",
              value: money(data.balanceMinor),
              description: reservationCount(data.counts.balance),
            },
            {
              id: "COMPLETED",
              label: "Finalizadas",
              value: data.counts.completed,
            },
            { id: "ALL", label: "Todas e historial", value: data.counts.all },
          ]}
        />
      )}
      <Link className="secondary" href="/?mode=venues">
        Reservar otra cancha
      </Link>
      <FormSheet
        variant="workspace"
        open={dashboard.filter !== null}
        title={
          selected
            ? "Tu reserva"
            : reservationFilterLabels[dashboard.filter ?? "ALL"]
        }
        onClose={() => dashboard.select(null)}
      >
        <DesktopDrilldown
          selected={selected !== null}
          list={
            <>
              <div className={styles.controls}>
                <label>
                  Categoría
                  <select
                    value={dashboard.filter ?? "ALL"}
                    onChange={(event) => choose(event.target.value)}
                  >
                    {Object.entries(reservationFilterLabels).map(
                      ([id, label]) => (
                        <option key={id} value={id}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              </div>
              {dashboard.loading ? (
                <p role="status">Cargando reservas…</p>
              ) : dashboard.error ? (
                <p role="alert" className="errorNotice">
                  {dashboard.error}
                </p>
              ) : (
                <div className={styles.list}>
                  {!data?.items.length ? (
                    <p className="empty">
                      No tienes reservas en esta categoría.
                    </p>
                  ) : (
                    data.items.map((item) => (
                      <button
                        className={styles.row}
                        aria-current={
                          selected?.id === item.id ? "true" : undefined
                        }
                        key={item.id}
                        type="button"
                        onClick={() => setSelected(item)}
                      >
                        <strong>{item.spaceName ?? "Cancha"}</strong>
                        <small>
                          {item.venueName ?? "Complejo"} ·{" "}
                          {reservationDate(item.startsAt)}
                        </small>
                        <small>
                          {reservationTime(item.startsAt)} –{" "}
                          {reservationTime(item.endsAt)}
                        </small>
                        <span>
                          {reservationStatus[item.status]} · Ver reserva →
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
              <nav
                className={styles.controls}
                aria-label="Páginas de mis reservas"
              >
                <button
                  className="secondary"
                  disabled={dashboard.loading || dashboard.page === 0}
                  onClick={() => dashboard.setPage(dashboard.page - 1)}
                >
                  Anterior
                </button>
                <span>
                  {reservationCount(data?.total ?? 0)} · Página{" "}
                  {dashboard.page + 1}
                </span>
                <button
                  className="secondary"
                  disabled={
                    dashboard.loading ||
                    (dashboard.page + 1) * 10 >= (data?.total ?? 0)
                  }
                  onClick={() => dashboard.setPage(dashboard.page + 1)}
                >
                  Siguiente
                </button>
              </nav>
            </>
          }
          detail={
            selected ? (
              <div className={styles.detail}>
                <button
                  data-drilldown-back
                  className="secondary"
                  type="button"
                  onClick={() => {
                    setSelected(null);
                    dashboard.refresh();
                  }}
                >
                  ← Volver a la lista
                </button>
                {renderDetail(selected)}
              </div>
            ) : null
          }
        />
      </FormSheet>
    </section>
  );
}
