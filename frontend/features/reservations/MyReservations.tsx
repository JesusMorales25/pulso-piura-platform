"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { apiRequest } from "@/lib/api";
import { ReservationCheckout } from "./ReservationCheckout";
import type { Reservation, ReservationPage } from "./types";
function ReservationItem({
  initial,
  accessToken,
  highlighted = false,
}: {
  initial: Reservation;
  accessToken: string;
  highlighted?: boolean;
}) {
  const [reservation, setReservation] = useState(initial);
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
              matchAssociated:
                next.matchAssociated ?? current.matchAssociated,
            },
      ),
    [],
  );
  return (
    <article
      className={`card reservationCard${highlighted ? " highlighted" : ""}`}
      id={`reservation-${reservation.id}`}
    >
      <ReservationCheckout
        accessToken={accessToken}
        reservation={reservation}
        venueName={reservation.venueName ?? "Complejo"}
        spaceName={reservation.spaceName ?? "Cancha"}
        onChange={update}
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
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void apiRequest<Reservation>(`/reservations/${reservationId}`, accessToken, {
      signal: controller.signal,
    })
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

  if (error) return <p className="inlineAlert errorNotice" role="alert">{error}</p>;
  if (!reservation) return <p className="notice">Preparando tu reserva…</p>;

  return (
    <div className="reservationList focusedReservationList">
      <ReservationItem accessToken={accessToken} highlighted initial={reservation} />
      <Link className="secondary focusedReservationHistoryLink" href="/actividad">
        Ver todas mis reservas
      </Link>
    </div>
  );
}

function ReservationsList({
  accessToken,
  highlightedReservationId,
}: {
  accessToken: string;
  highlightedReservationId: string;
}) {
  const [result, setResult] = useState<ReservationPage | null>(null);
  const [page, setPage] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    if (accessToken)
      apiRequest<ReservationPage>(
        `/me/reservations?size=10&page=${page}`,
        accessToken,
        { signal: controller.signal },
      )
        .then((value) => {
          if (!controller.signal.aborted) setResult(value);
        })
        .catch((reason) => {
          if (!controller.signal.aborted)
            setError(
              reason instanceof Error
                ? reason.message
                : "No se pudieron cargar tus reservas.",
            );
        });
    return () => controller.abort();
  }, [accessToken, page]);
  useEffect(() => {
    if (!result || !highlightedReservationId) return;
    const timer = window.setTimeout(() => {
      document
        .getElementById(`reservation-${highlightedReservationId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [highlightedReservationId, result]);
  if (error)
    return (
      <p className="inlineAlert errorNotice" role="alert">
        {error}
      </p>
    );
  if (!result) return <p className="notice">Cargando tus reservas…</p>;
  return (
    <div className="reservationList">
      <p className="notice">
        Pagos en modo de pruebas. No hay cobros reales. Puedes cancelar hasta 2
        horas antes; los importes pagados se retienen sin devolución.
      </p>
      {result.items.length === 0 ? (
        <div className="empty">
          <h2>Aún no tienes reservas</h2>
          <Link className="primary" href="/?mode=venues">
            Explorar canchas
          </Link>
        </div>
      ) : (
        result.items.map((reservation) => (
          <ReservationItem
            key={`${accessToken}:${reservation.id}`}
            initial={reservation}
            accessToken={accessToken}
            highlighted={reservation.id === highlightedReservationId}
          />
        ))
      )}
      <nav className="checkoutActions" aria-label="Páginas de reservas">
        <button
          className="secondary"
          disabled={page === 0}
          onClick={() => {
            setResult(null);
            setPage(page - 1);
          }}
        >
          Anterior
        </button>
        <span>
          Página {page + 1} · {result.total} reservas
        </span>
        <button
          className="secondary"
          disabled={(page + 1) * 10 >= result.total}
          onClick={() => {
            setResult(null);
            setPage(page + 1);
          }}
        >
          Siguiente
        </button>
      </nav>
    </div>
  );
}

export function MyReservations({
  highlightedReservationId,
}: {
  highlightedReservationId?: string;
}) {
  const { accessToken, loading: authLoading, login } = useAuth();
  if (authLoading) return <p className="notice">Revisando tu sesión…</p>;
  if (!accessToken)
    return (
      <div className="empty">
        <h2>Ingresa para ver tu actividad</h2>
        <p>Tus reservas se mantienen asociadas a tu cuenta.</p>
        <button
          className="primary borderless"
          onClick={() => void login(false, "/actividad")}
        >
          Ingresar
        </button>
      </div>
    );
  return (
    highlightedReservationId ? (
      <FocusedReservation
        accessToken={accessToken}
        reservationId={highlightedReservationId}
      />
    ) : (
      <ReservationsList
        key={accessToken}
        accessToken={accessToken}
        highlightedReservationId=""
      />
    )
  );
}
