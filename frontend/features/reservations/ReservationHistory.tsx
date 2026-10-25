"use client";
import { useEffect, useState } from "react";
import {
  ArrowSquareOut,
  CheckCircle,
  Clock,
  DotsThree,
  FileText,
  Warning,
} from "@phosphor-icons/react";
import { FormSheet } from "@/components/forms/FormSheet";
import { apiRequest } from "@/lib/api";
import type { ExternalProof } from "@/features/payments/ExternalPaymentPanel";
import { reservationStatus } from "./presentation";
import type { Reservation } from "./types";
import styles from "./ReservationHistory.module.css";
type StatusEvent = {
  id: string;
  previousStatus: string | null;
  status: Reservation["status"];
  occurredAt: string;
};
type PaymentEvent = {
  id: string;
  proofId: string;
  action: string;
  note: string | null;
  occurredAt: string;
};
const paymentLabels: Record<string, string> = {
  PROOF_SUBMITTED: "Comprobante enviado",
  CONFIRMED: "Pago confirmado",
  REJECTED: "Comprobante rechazado",
  CORRECTION_REQUIRED: "Necesita corrección",
  NEEDS_RESOLUTION: "Pago por resolver",
};
export function ReservationHistory({
  open,
  onClose,
  reservationId,
  accessToken,
  proofs,
  onViewProof,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  reservationId: string;
  accessToken: string;
  proofs: ExternalProof[];
  onViewProof: (proof: ExternalProof) => void;
  busy: boolean;
}) {
  const [events, setEvents] = useState<
    {
      id: string;
      title: string;
      at: string;
      status: string;
      note?: string | null;
      proofId?: string;
      previous?: string | null;
    }[]
  >([]);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [states, payments] = await Promise.all([
          apiRequest<StatusEvent[]>(
            `/reservations/${reservationId}/history`,
            accessToken,
            { signal: controller.signal },
          ),
          apiRequest<PaymentEvent[]>(
            `/external-payments/history?targetType=RESERVATION&targetId=${encodeURIComponent(reservationId)}`,
            accessToken,
            { signal: controller.signal },
          ),
        ]);
        if (controller.signal.aborted) return;
        setEvents(
          [
            ...states.map((event) => ({
              id: event.id,
              title:
                event.previousStatus === null
                  ? "Reserva creada"
                  : `Reserva: ${reservationStatus[event.status] ?? event.status}`,
              at: event.occurredAt,
              status: event.status,
              previous: event.previousStatus,
            })),
            ...payments
              .filter((event) => paymentLabels[event.action])
              .map((event) => ({
                id: event.id,
                title: paymentLabels[event.action],
                at: event.occurredAt,
                status: event.action,
                note: event.note,
                proofId: event.proofId,
              })),
          ].sort(
            (a, b) =>
              Date.parse(b.at) - Date.parse(a.at) || b.id.localeCompare(a.id),
          ),
        );
      } catch (reason) {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "No pudimos cargar el historial.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [open, reservationId, accessToken, revision]);
  return (
    <FormSheet open={open} title="Historial de estados" onClose={onClose}>
      <div className={styles.history}>
        <p className={styles.intro}>
          Revisa el detalle de cada cambio en tu reserva.
        </p>
        {loading ? (
          <p role="status">Cargando historial…</p>
        ) : error ? (
          <div role="alert">
            <p>{error}</p>
            <button
              className="secondary"
              type="button"
              onClick={() => setRevision((value) => value + 1)}
            >
              Reintentar historial
            </button>
          </div>
        ) : !events.length ? (
          <p>No hay cambios registrados para esta reserva.</p>
        ) : (
          <ol className={styles.timeline}>
            {events.map((event) => {
              const proof = proofs.find((item) => item.id === event.proofId);
              const positive = event.status === "CONFIRMED",
                warning = [
                  "CORRECTION_REQUIRED",
                  "REJECTED",
                  "NEEDS_RESOLUTION",
                ].includes(event.status);
              const Icon = positive
                ? CheckCircle
                : warning
                  ? Warning
                  : event.proofId
                    ? Clock
                    : DotsThree;
              return (
                <li
                  key={event.id}
                  className={styles.event}
                  data-tone={
                    positive ? "positive" : warning ? "warning" : "neutral"
                  }
                >
                  <span className={styles.marker}>
                    <Icon weight="fill" aria-hidden="true" />
                  </span>
                  <div className={styles.eventHead}>
                    <h3>{event.title}</h3>
                    <time dateTime={event.at}>
                      {new Date(event.at).toLocaleDateString("es-PE", {
                        timeZone: "America/Lima",
                      })}
                      <br />
                      {new Date(event.at).toLocaleTimeString("es-PE", {
                        timeZone: "America/Lima",
                      })}
                    </time>
                  </div>
                  <div className={styles.body}>
                    <dl>
                      {proof && (
                        <>
                          <dt>Importe</dt>
                          <dd>
                            {new Intl.NumberFormat("es-PE", {
                              style: "currency",
                              currency: proof.currency,
                            }).format(proof.amountMinor / 100)}{" "}
                            · {proof.method}
                          </dd>
                          <dt>Receptor</dt>
                          <dd>
                            {proof.holderName} · {proof.phone}
                          </dd>
                        </>
                      )}
                      {event.note && (
                        <>
                          <dt>Motivo</dt>
                          <dd>{event.note}</dd>
                        </>
                      )}
                      {!event.proofId && (
                        <>
                          <dt>Estado</dt>
                          <dd>
                            {reservationStatus[
                              event.status as Reservation["status"]
                            ] ?? event.status}
                          </dd>
                          {event.previous && (
                            <>
                              <dt>Anterior</dt>
                              <dd>
                                {reservationStatus[
                                  event.previous as Reservation["status"]
                                ] ?? event.previous}
                              </dd>
                            </>
                          )}
                        </>
                      )}
                    </dl>
                    {proof?.hasImage && (
                      <button
                        className={styles.proof}
                        disabled={busy}
                        type="button"
                        onClick={() => onViewProof(proof)}
                      >
                        <FileText aria-hidden="true" />
                        Ver comprobante
                        <ArrowSquareOut aria-hidden="true" />
                      </button>
                    )}
                    {proof && !proof.hasImage && (
                      <p className={styles.retained}>
                        El registro se conserva; la imagen ya no está
                        disponible.
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </FormSheet>
  );
}
