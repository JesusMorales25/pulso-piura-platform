"use client";
import Link from "next/link";
import { ReservationListCard } from "./ReservationListCard";
import {
  CalendarCheck,
  CalendarDots,
  ClipboardText,
  CreditCard,
  CurrencyCircleDollar,
  MagnifyingGlass,
  Wallet,
} from "@phosphor-icons/react";
import overviewStyles from "./PlayerReservationOverview.module.css";
import { useState, type ReactNode } from "react";
import { FormSheet } from "@/components/forms/FormSheet";
import { DesktopDrilldown } from "@/components/dashboard/DesktopDrilldown";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import type { Reservation } from "./types";
import { money, reservationCount } from "./presentation";
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
      <div className={`activitySectionTitle ${overviewStyles.heading}`}>
        <div>
          <p className="eyebrow">MIS RESERVAS</p>
          <h2>Reservas</h2>
        </div>
        <Link className={overviewStyles.search} href="/?mode=venues">
          <MagnifyingGlass size={19} aria-hidden="true" />
          Buscar canchas
        </Link>
      </div>
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
          variant="player"
          selectedId={dashboard.filter}
          onSelect={choose}
          items={[
            {
              id: "PENDING_PAYMENT_CONFIRMATION",
              label: "Por confirmar pago",
              icon: <CreditCard weight="duotone" />,
              value: data.counts.pendingConfirmation,
            },
            {
              id: "PENDING_PAYMENT",
              label: "Pendientes de pago",
              icon: <Wallet weight="duotone" />,
              value: data.counts.pendingPayment,
            },
            {
              id: "CONFIRMED",
              label: "Confirmadas",
              icon: <CalendarCheck weight="duotone" />,
              tone: "confirmed",
              value: data.counts.confirmed,
            },
            {
              id: "BALANCE",
              label: "Saldo pendiente",
              icon: <CurrencyCircleDollar weight="duotone" />,
              value: data.counts.balance,
              description: `${money(data.balanceMinor)} por pagar`,
            },
            {
              id: "COMPLETED",
              label: "Finalizadas",
              icon: <ClipboardText weight="duotone" />,
              tone: "muted",
              value: data.counts.completed,
            },
            {
              id: "ALL",
              label: "Todas mis reservas",
              value: data.counts.all,
              icon: <CalendarDots weight="duotone" />,
            },
          ]}
        />
      )}
      {data?.counts.all === 0 && (
        <div className="empty compactEmpty">
          <h3>Aún no tienes reservas</h3>
          <p>Busca una cancha para organizar tu próxima jugada.</p>
        </div>
      )}
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
        {!selected && (
          <p className={overviewStyles.intro}>
            {dashboard.filter === "CONFIRMED"
              ? "Revisa tus reservas confirmadas."
              : "Revisa tus reservas y abre una para ver el detalle."}
          </p>
        )}
        <DesktopDrilldown
          selected={selected !== null}
          list={
            <>
              <div className={`${styles.controls} ${overviewStyles.filter}`}>
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
                      <ReservationListCard
                        key={item.id}
                        reservation={item}
                        selected={selected?.id === item.id}
                        onSelect={() => setSelected(item)}
                      />
                    ))
                  )}
                </div>
              )}
              <nav
                className={overviewStyles.pagination}
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
                  {dashboard.page + 1} de{" "}
                  {Math.max(
                    1,
                    Math.ceil((data?.total ?? 0) / (data?.size ?? 10)),
                  )}
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
