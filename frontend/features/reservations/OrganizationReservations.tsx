"use client";
import { useState } from "react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthProvider";
import { ExternalPaymentPanel } from "@/features/payments/ExternalPaymentPanel";
import { FormSheet } from "@/components/forms/FormSheet";
import { DesktopDrilldown } from "@/components/dashboard/DesktopDrilldown";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import {
  money,
  reservationDate,
  reservationTime,
  reservationStatus,
  reservationCount,
} from "./presentation";
import type { Reservation } from "./types";
import { ReservationCheckInScanner } from "./ReservationCheckInScanner";
import {
  useReservationDashboard,
  reservationFilterLabels,
  type ReservationFilter,
} from "./useReservationDashboard";
import styles from "./ReservationDrilldown.module.css";
type Item = Reservation & {
  spaceName: string;
  venueName: string;
  customerEmail: string | null;
};
function Dashboard({
  organizationId,
  accessToken,
}: {
  organizationId: string;
  accessToken: string;
}) {
  const dashboard = useReservationDashboard<Item>(
    accessToken,
    `/organizations/${organizationId}/reservations/dashboard`,
  );
  const [selected, setSelected] = useState<Item | null>(null);
  const [scanner, setScanner] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const choose = (value: string) => {
    setSelected(null);
    setConfirmCancel(false);
    setError("");
    dashboard.select(value as ReservationFilter);
  };
  async function refreshSelected() {
    dashboard.refresh();
    if (!selected) return;
    try {
      const value = await apiRequest<Reservation>(
        `/reservations/${selected.id}`,
        accessToken,
      );
      setSelected((current) =>
        current?.id === value.id
          ? {
              ...current,
              ...value,
              spaceName: value.spaceName ?? current.spaceName,
              venueName: value.venueName ?? current.venueName,
            }
          : current,
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No se pudo actualizar la reserva.",
      );
    }
  }
  async function cancel() {
    if (!selected || busy) return;
    setBusy(true);
    setError("");
    try {
      const value = await apiRequest<Reservation>(
        `/organizations/${organizationId}/reservations/${selected.id}/cancel`,
        accessToken,
        {
          method: "POST",
          headers: { "X-Correlation-Id": crypto.randomUUID() },
        },
      );
      setSelected((current) =>
        current
          ? {
              ...current,
              ...value,
              spaceName: value.spaceName ?? current.spaceName,
              venueName: value.venueName ?? current.venueName,
            }
          : current,
      );
      setConfirmCancel(false);
      dashboard.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "No se pudo cancelar.",
      );
    } finally {
      setBusy(false);
    }
  }
  const data = dashboard.data;
  return (
    <section
      className={styles.overview}
      aria-labelledby="reservation-dashboard-title"
    >
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">OPERACIÓN</p>
          <h2 id="reservation-dashboard-title">Reservas de tus canchas</h2>
        </div>
      </div>
      <p className="muted">
        Selecciona una categoría para revisar sus reservas.
      </p>
      {dashboard.error && (
        <div className="errorNotice" role="alert">
          {dashboard.error}
          <button className="secondary" onClick={dashboard.refresh}>
            Reintentar
          </button>
        </div>
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
              id: "PAID",
              label: "Pagos registrados",
              value: money(data.paidMinor),
              numericValue: data.paidMinor,
              description: `${data.counts.paid} reservas`,
            },
            {
              id: "BALANCE",
              label: "Saldo por cobrar",
              value: money(data.balanceMinor),
              numericValue: data.balanceMinor,
              description: `${data.counts.balance} reservas`,
            },
            {
              id: "ALL",
              label: "Todas e historial",
              value: data.counts.all,
              description: "Incluye finalizadas, canceladas y vencidas",
            },
          ]}
        />
      )}
      {data?.counts.all === 0 && (
        <p className="empty">Aún no hay reservas registradas en tus canchas.</p>
      )}
      <button
        className="secondary"
        type="button"
        onClick={() => setScanner(true)}
      >
        Validar llegada con QR
      </button>
      <details className="muted">
        <summary>Sobre los pagos registrados</summary>
        <p>
          Las simulaciones anteriores no acreditan dinero recibido. Consulta el
          comprobante confirmado de cada reserva.
        </p>
      </details>
      <FormSheet
        variant="workspace"
        open={dashboard.filter !== null}
        title={
          selected
            ? "Detalle de reserva"
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
                    disabled={busy}
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
                    <p className="empty">No hay reservas en esta categoría.</p>
                  ) : (
                    data.items.map((item) => (
                      <button
                        className={styles.row}
                        disabled={busy}
                        aria-current={
                          selected?.id === item.id ? "true" : undefined
                        }
                        type="button"
                        key={item.id}
                        onClick={() => {
                          setSelected(item);
                          setConfirmCancel(false);
                          setError("");
                        }}
                      >
                        <strong>{item.spaceName}</strong>
                        <small>
                          {item.venueName} · {reservationDate(item.startsAt)}
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
              <nav className={styles.controls} aria-label="Páginas de reservas">
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
                    setError("");
                    setConfirmCancel(false);
                    dashboard.refresh();
                  }}
                >
                  ← Volver a la lista
                </button>
                <header>
                  <h3>{selected.spaceName}</h3>
                  <span className="pill">
                    {reservationStatus[selected.status]}
                  </span>
                </header>
                <p>{selected.venueName}</p>
                <p>
                  {reservationDate(selected.startsAt)} ·{" "}
                  {reservationTime(selected.startsAt)} –{" "}
                  {reservationTime(selected.endsAt)}
                </p>
                <p>Cliente: {selected.customerEmail ?? "Cliente registrado"}</p>
                <dl className="reservationSummary">
                  <div>
                    <dt>Total</dt>
                    <dd>{money(selected.totalMinor)}</dd>
                  </div>
                  <div>
                    <dt>Pagos registrados</dt>
                    <dd>{money(selected.paidMinor)}</dd>
                  </div>
                  <div>
                    <dt>Saldo pendiente</dt>
                    <dd>
                      {money(
                        Math.max(0, selected.totalMinor - selected.paidMinor),
                      )}
                    </dd>
                  </div>
                </dl>
                <ExternalPaymentPanel
                  accessToken={accessToken}
                  targetType="RESERVATION"
                  targetId={selected.id}
                  reviewer
                  allowUpload={false}
                  onChange={() => void refreshSelected()}
                />
                {error && (
                  <p role="alert" className="errorNotice">
                    {error}
                  </p>
                )}
                {[
                  "HOLD",
                  "PENDING_PAYMENT",
                  "PENDING_PAYMENT_CONFIRMATION",
                  "CONFIRMED",
                ].includes(selected.status) &&
                  (selected.paidMinor > 0 ? (
                    <p className="muted">
                      No se puede cancelar desde aquí: tiene pagos registrados.
                    </p>
                  ) : confirmCancel ? (
                    <div>
                      <p>¿Cancelar y liberar este horario?</p>
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={() => setConfirmCancel(false)}
                      >
                        Conservar
                      </button>
                      <button
                        className="secondary"
                        disabled={busy}
                        onClick={() => void cancel()}
                      >
                        {busy ? "Cancelando…" : "Confirmar cancelación"}
                      </button>
                    </div>
                  ) : (
                    <button
                      className="secondary"
                      onClick={() => setConfirmCancel(true)}
                    >
                      Cancelar reserva
                    </button>
                  ))}
              </div>
            ) : null
          }
        />
      </FormSheet>
      <FormSheet
        open={scanner}
        title="Validar llegada"
        onClose={() => setScanner(false)}
      >
        {scanner && (
          <ReservationCheckInScanner
            organizationId={organizationId}
            accessToken={accessToken}
            onCheckedIn={dashboard.refresh}
          />
        )}
      </FormSheet>
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
