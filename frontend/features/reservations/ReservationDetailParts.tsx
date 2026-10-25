"use client";
import {
  CalendarBlank,
  CheckCircle,
  Clock,
  Coins,
  CreditCard,
  ChartPie,
  MapPin,
  User,
  Receipt,
} from "@phosphor-icons/react";
import { ReservationCourtPhoto } from "./ReservationCourtPhoto";
import type { Reservation } from "./types";
import {
  money,
  reservationDate,
  reservationTime,
  reservationStatus,
} from "./presentation";
import styles from "./ReservationDetail.module.css";
export function ReservationDetailHeading({
  reservation,
  venueName,
  spaceName,
}: {
  reservation: Reservation;
  venueName?: string;
  spaceName?: string;
}) {
  return (
    <div className={styles.court}>
      <span className={styles.photo} aria-hidden="true">
        <ReservationCourtPhoto
          spaceId={reservation.sportSpaceId}
          className={styles.image}
        />
      </span>
      <div className={styles.courtInfo}>
        <div className={styles.title}>
          <h3>{spaceName ?? reservation.spaceName ?? "Cancha"}</h3>
          <span
            className={styles.status}
            data-confirmed={reservation.status === "CONFIRMED"}
          >
            {reservation.status === "CONFIRMED" && (
              <CheckCircle weight="fill" aria-hidden="true" />
            )}
            {reservationStatus[reservation.status]}
          </span>
        </div>
        <p>
          <MapPin aria-hidden="true" />
          {venueName ?? reservation.venueName ?? "Complejo"}
        </p>
        <p>
          <CalendarBlank aria-hidden="true" />
          {reservationDate(reservation.startsAt)}
        </p>
        <p>
          <Clock aria-hidden="true" />
          {reservationTime(reservation.startsAt)} –{" "}
          {reservationTime(reservation.endsAt)}
        </p>
      </div>
    </div>
  );
}
export function ReservationCustomer({ email }: { email: string | null }) {
  return (
    <section className={styles.section}>
      <h4>
        <User aria-hidden="true" />
        Información de la reserva
      </h4>
      <dl className={styles.customer}>
        <dt>Cliente</dt>
        <dd>{email ?? "Cliente registrado"}</dd>
      </dl>
    </section>
  );
}
export function ReservationAmounts({
  reservation,
  paid = reservation.paidMinor,
}: {
  reservation: Reservation;
  paid?: number;
}) {
  const cancelled = reservation.status === "CANCELLED";
  return (
    <section className={styles.section}>
      <h4>
        <Receipt aria-hidden="true" />
        Resumen de montos
      </h4>
      <dl className={styles.amounts}>
        {[
          { label: "Total", value: reservation.totalMinor, Icon: Coins },
          { label: "Pagos registrados", value: paid, Icon: CreditCard },
          {
            label: cancelled
              ? "Importe retenido, sin devolución"
              : "Saldo pendiente",
            value: cancelled
              ? paid
              : Math.max(0, reservation.totalMinor - paid),
            Icon: ChartPie,
          },
        ].map(({ label, value, Icon }) => (
          <div key={label}>
            <Icon aria-hidden="true" />
            <div>
              <dt>{label}</dt>
              <dd>{money(value)}</dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function ReservationBookingHeading({
  reservation,
  venueName,
  spaceName,
}: {
  reservation: Reservation;
  venueName: string;
  spaceName: string;
}) {
  return (
    <section className={styles.booking}>
      <div className={styles.bookingIdentity}>
        <div>
          <div className={styles.bookingStatus}>
            <span>TU RESERVA</span>
            <span
              className={styles.status}
              data-confirmed={reservation.status === "CONFIRMED"}
            >
              {reservation.status === "CONFIRMED" && (
                <CheckCircle weight="fill" aria-hidden="true" />
              )}
              {reservationStatus[reservation.status]}
            </span>
          </div>
          <h3>{spaceName}</h3>
          <p>
            <MapPin aria-hidden="true" />
            {venueName}
          </p>
        </div>
        <span className={styles.bookingPhoto} aria-hidden="true">
          <ReservationCourtPhoto
            spaceId={reservation.sportSpaceId}
            className={styles.image}
          />
        </span>
      </div>
      <dl className={styles.bookingSchedule}>
        <div>
          <CalendarBlank aria-hidden="true" />
          <div>
            <dt>Fecha</dt>
            <dd>{reservationDate(reservation.startsAt)}</dd>
          </div>
        </div>
        <div>
          <Clock aria-hidden="true" />
          <div>
            <dt>Horario</dt>
            <dd>
              {reservationTime(reservation.startsAt)} –{" "}
              {reservationTime(reservation.endsAt)}
            </dd>
          </div>
        </div>
      </dl>
    </section>
  );
}
