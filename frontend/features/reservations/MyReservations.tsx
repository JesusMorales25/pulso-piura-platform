"use client";
import Link from "next/link";
import { ActivitySignInPrompt } from "@/features/activity/ActivitySignInPrompt";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { apiRequest } from "@/lib/api";
import { ReservationCheckout } from "./ReservationCheckout";
import { FormSheet } from "@/components/forms/FormSheet";
import { reservationDate, reservationStatus } from "./presentation";
import { PlayerReservationOverview } from "./PlayerReservationOverview";
import type { Reservation } from "./types";
function ReservationItem({
  initial,
  accessToken,
  highlighted = false,
  paymentActive = true,
  onSelectPayment,
  onChange,
}: {
  initial: Reservation;
  accessToken: string;
  highlighted?: boolean;
  paymentActive?: boolean;
  onSelectPayment?: () => void;
  onChange?: (reservation: Reservation) => void;
}) {
  const [reservation, setReservation] = useState(initial);
  useEffect(() => {
    onChange?.(reservation);
  }, [reservation, onChange]);
  const update = useCallback(
    (next: Reservation) =>
      setReservation((current) =>
        next.version < current.version
          ? current
          : {
              ...next,
              venueName: next.venueName ?? current.venueName,
              spaceName: next.spaceName ?? current.spaceName,
              spaceCapacity: next.spaceCapacity ?? current.spaceCapacity,
              matchAssociated: next.matchAssociated ?? current.matchAssociated,
            },
      ),
    [],
  );
  return (
    <article
      className={`card reservationCard${highlighted ? " highlighted" : ""}`}
      id={`reservation-${reservation.id}`}
    >
      {onSelectPayment && canPay(reservation) && (
        <button
          className="secondary"
          type="button"
          aria-pressed={paymentActive}
          onClick={onSelectPayment}
        >
          {paymentActive
            ? "Reserva seleccionada para pagar"
            : "Seleccionar para pagar"}
        </button>
      )}
      <ReservationCheckout
        accessToken={accessToken}
        reservation={reservation}
        venueName={reservation.venueName ?? "Complejo"}
        spaceName={reservation.spaceName ?? "Cancha"}
        onChange={update}
        paymentActive={paymentActive}
      />
    </article>
  );
}

function FocusedReservation({
  accessToken,
  reservationId,
}: {
  accessToken: string;
  reservationId: string;
}) {
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [detailOpen, setDetailOpen] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void apiRequest<Reservation>(
      `/reservations/${reservationId}`,
      accessToken,
      {
        signal: controller.signal,
      },
    )
      .then((value) => {
        if (!controller.signal.aborted) setReservation(value);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) {
          setError(
            reason instanceof Error
              ? reason.message
              : "No se pudo cargar esta reserva.",
          );
        }
      });
    return () => controller.abort();
  }, [accessToken, reservationId]);

  if (error)
    return (
      <p className="inlineAlert errorNotice" role="alert">
        {error}
      </p>
    );
  if (!reservation) return <p className="notice">Preparando tu reserva…</p>;

  return (
    <div className="reservationList focusedReservationList">
      <div className="card">
        <p className="eyebrow">TU RESERVA</p>
        <h2>{reservation.spaceName ?? "Cancha"}</h2>
        <p>
          {reservationDate(reservation.startsAt)} ·{" "}
          {reservationStatus[reservation.status]}
        </p>
        <button
          className="primary"
          type="button"
          onClick={() => setDetailOpen(true)}
        >
          Ver reserva y pago
        </button>
      </div>
      <FormSheet
        open={detailOpen}
        title="Detalle de reserva"
        onClose={() => setDetailOpen(false)}
      >
        <ReservationItem
          accessToken={accessToken}
          highlighted
          initial={reservation}
          onChange={setReservation}
        />
      </FormSheet>
      <Link
        className="secondary focusedReservationHistoryLink"
        href="/actividad"
      >
        Ver todas mis reservas
      </Link>
    </div>
  );
}

function ReservationsList({ accessToken }: { accessToken: string }) {
  return (
    <PlayerReservationOverview
      accessToken={accessToken}
      renderDetail={(reservation) => (
        <ReservationItem
          key={reservation.id}
          initial={reservation}
          accessToken={accessToken}
        />
      )}
    />
  );
}

function canPay(reservation: Reservation) {
  if (reservation.status === "CONFIRMED")
    return (
      reservation.paidMinor > 0 &&
      reservation.paidMinor < reservation.totalMinor
    );
  return (
    (reservation.status === "HOLD" ||
      reservation.status === "PENDING_PAYMENT" ||
      reservation.status === "PENDING_PAYMENT_CONFIRMATION") &&
    (!reservation.expiresAt || Date.parse(reservation.expiresAt) > Date.now())
  );
}

export function MyReservations({
  highlightedReservationId,
}: {
  highlightedReservationId?: string;
}) {
  const { accessToken, loading: authLoading } = useAuth();
  if (authLoading) return <p className="notice">Revisando tu sesión…</p>;
  if (!accessToken) return <ActivitySignInPrompt type="reservations" />;
  return highlightedReservationId ? (
    <FocusedReservation
      key={highlightedReservationId}
      accessToken={accessToken}
      reservationId={highlightedReservationId}
    />
  ) : (
    <ReservationsList accessToken={accessToken} />
  );
}
