"use client";
import { useEffect, useRef, useState } from "react";
import { CheckCircle, Clock, DeviceMobile } from "@phosphor-icons/react";
import { apiRequest } from "@/lib/api";
import type { Reservation } from "./types";
import {
  canPlayerCancel,
  money,
  reservationDate,
  reservationStatus,
  reservationTime,
} from "./presentation";
import { ReservationQrPass } from "./ReservationQrPass";
type PaymentOrder = {
  id: string;
  status: string;
  method: "YAPE" | "PLIN";
  plan: "DEPOSIT" | "FULL" | "BALANCE";
  amountMinor: number;
  providerReference: string | null;
};
type Props = {
  accessToken: string;
  reservation: Reservation;
  venueName: string;
  spaceName: string;
  onChange: (reservation: Reservation) => void;
};
export function ReservationCheckout({
  accessToken,
  reservation,
  venueName,
  spaceName,
  onChange,
}: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const revision = useRef(0);
  const [error, setError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"YAPE" | "PLIN">("YAPE");
  const [plan, setPlan] = useState<"DEPOSIT" | "FULL">("DEPOSIT");
  const [accepted, setAccepted] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [simulation, setSimulation] = useState<boolean | null>(null);
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [checkoutRefresh, setCheckoutRefresh] = useState(0);
  const requestKey = useRef(crypto.randomUUID());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let timer: number;
    async function refresh() {
      try {
        const startedRevision = revision.current;
        const [current, payments, capabilities] = await Promise.all([
          apiRequest<Reservation>(
            `/reservations/${reservation.id}`,
            accessToken,
            { signal: controller.signal },
          ),
          apiRequest<PaymentOrder[]>(
            `/payment-orders?reservationId=${reservation.id}`,
            accessToken,
            { signal: controller.signal },
          ),
          apiRequest<{ simulationEnabled: boolean }>(
            "/payment-orders/capabilities",
            null,
            { signal: controller.signal },
          ),
        ]);
        if (
          !controller.signal.aborted &&
          !inFlight.current &&
          startedRevision === revision.current
        ) {
          onChange(current);
          setOrders(payments);
          setOrdersLoaded(true);
          setSimulation(capabilities.simulationEnabled);
          setError("");
        }
      } catch (reason) {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "No se pudo verificar la reserva. Reintenta antes de pagar.",
          );
      } finally {
        if (!controller.signal.aborted)
          timer = window.setTimeout(() => void refresh(), 8000);
      }
    }
    void refresh();
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [accessToken, reservation.id, onChange, checkoutRefresh]);
  const paid = reservation.paidMinor ?? 0;
  const remaining = reservation.expiresAt
    ? Math.max(
        0,
        Math.ceil((new Date(reservation.expiresAt).getTime() - now) / 1000),
      )
    : 0;
  const temporary =
    reservation.status === "HOLD" || reservation.status === "PENDING_PAYMENT";
  const expired = temporary && remaining === 0;
  const balancePayment =
    reservation.status === "CONFIRMED" &&
    paid > 0 &&
    paid < reservation.totalMinor;
  const pending = orders.find(
    (order) =>
      order.status === "PENDING" &&
      (balancePayment ? order.plan === "BALANCE" : order.plan !== "BALANCE"),
  );
  const amount =
    pending?.amountMinor ??
    (balancePayment
      ? reservation.totalMinor - paid
      : plan === "DEPOSIT"
        ? Math.ceil(reservation.totalMinor / 4)
        : reservation.totalMinor);
  const selectedMethod = pending?.method ?? paymentMethod;
  const selectedPlan = pending?.plan ?? plan;
  const checkoutReady = simulation === true && ordersLoaded;
  const checkInPassAvailable =
    reservation.status === "COMPLETED" ||
    (reservation.status === "CONFIRMED" &&
      now < new Date(reservation.endsAt).getTime() + 12 * 60 * 60 * 1000);
  async function pay() {
    if (
      inFlight.current ||
      !accepted ||
      !simulation ||
      !ordersLoaded ||
      expired
    )
      return;
    inFlight.current = true;
    revision.current += 1;
    setBusy(true);
    setError("");
    try {
      const order =
        pending ??
        (await apiRequest<PaymentOrder>("/payment-orders", accessToken, {
          method: "POST",
          headers: {
            "Idempotency-Key": requestKey.current,
            "X-Correlation-Id": crypto.randomUUID(),
          },
          body: JSON.stringify({
            reservationId: reservation.id,
            method: paymentMethod,
            plan: balancePayment ? "BALANCE" : plan,
          }),
        }));
      setOrders((current) => [
        ...current.filter((item) => item.id !== order.id),
        order,
      ]);
      const settled = await apiRequest<PaymentOrder>(
        `/payment-orders/${order.id}/simulate`,
        accessToken,
        {
          method: "POST",
          headers: { "X-Correlation-Id": crypto.randomUUID() },
        },
      );
      setOrders((current) => [
        ...current.filter((item) => item.id !== settled.id),
        settled,
      ]);
      onChange(
        await apiRequest<Reservation>(
          `/reservations/${reservation.id}`,
          accessToken,
        ),
      );
      requestKey.current = crypto.randomUUID();
      setAccepted(false);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No se pudo verificar el pago. Retoma la misma orden para evitar duplicados.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  async function cancel() {
    if (inFlight.current || !canPlayerCancel(reservation, Date.now())) return;
    inFlight.current = true;
    revision.current += 1;
    setBusy(true);
    setError("");
    try {
      onChange(
        await apiRequest<Reservation>(
          `/reservations/${reservation.id}/cancel`,
          accessToken,
          {
            method: "POST",
            headers: { "X-Correlation-Id": crypto.randomUUID() },
          },
        ),
      );
      setConfirmCancel(false);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "No se pudo cancelar.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="reservationCheckout">
      <div className="checkoutHead">
        <div>
          <p className="eyebrow">TU RESERVA</p>
          <h3>
            {expired ? "Tiempo vencido" : reservationStatus[reservation.status]}
          </h3>
        </div>
        {temporary && !expired && (
          <span className="holdTimer" aria-label="Tiempo restante">
            <Clock aria-hidden="true" size={18} />
            {String(Math.floor(remaining / 60)).padStart(2, "0")}:
            {String(remaining % 60).padStart(2, "0")}
          </span>
        )}
      </div>
      <dl className="reservationSummary">
        <div>
          <dt>Complejo</dt>
          <dd>{venueName}</dd>
        </div>
        <div>
          <dt>Cancha</dt>
          <dd>{spaceName}</dd>
        </div>
        <div>
          <dt>Fecha</dt>
          <dd>{reservationDate(reservation.startsAt)}</dd>
        </div>
        <div>
          <dt>Horario</dt>
          <dd>
            {reservationTime(reservation.startsAt)} –{" "}
            {reservationTime(reservation.endsAt)}
          </dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd>{money(reservation.totalMinor)}</dd>
        </div>
        <div>
          <dt>Pagado en pruebas</dt>
          <dd>{money(paid)}</dd>
        </div>
        <div>
          <dt>
            {reservation.status === "CANCELLED"
              ? "Importe retenido, sin devolución"
              : "Saldo pendiente"}
          </dt>
          <dd>
            {money(
              reservation.status === "CANCELLED"
                ? paid
                : Math.max(0, reservation.totalMinor - paid),
            )}
          </dd>
        </div>
      </dl>
      {error && (
        <p className="inlineAlert errorNotice" role="alert">
          {error}
        </p>
      )}
      {expired && (
        <p role="status">
          El horario ya no está retenido. Consulta la disponibilidad para
          iniciar otra reserva.
        </p>
      )}
      {((temporary && !expired) || balancePayment) && (
        <div className="paymentChoice">
          <p className="eyebrow">MODO DE PRUEBAS · SIN COBROS REALES</p>
          <p>
            El horario es exclusivo para ti durante el contador. Una reserva
            confirmada conserva el horario.
          </p>
          {!balancePayment && (
            <div
              className="paymentMethods"
              role="group"
              aria-label="Importe a pagar"
            >
              {(["DEPOSIT", "FULL"] as const).map((value) => (
                <button
                  type="button"
                  key={value}
                  className={
                    selectedPlan === value
                      ? "paymentMethod active"
                      : "paymentMethod"
                  }
                  aria-pressed={selectedPlan === value}
                  disabled={busy || !!pending}
                  onClick={() => {
                    setPlan(value);
                    requestKey.current = crypto.randomUUID();
                  }}
                >
                  {value === "DEPOSIT" ? "Adelanto 25%" : "Pago completo"}
                </button>
              ))}
            </div>
          )}
          <div
            className="paymentMethods"
            role="group"
            aria-label="Método de pago"
          >
            {(["YAPE", "PLIN"] as const).map((method) => (
              <button
                type="button"
                key={method}
                className={
                  selectedMethod === method
                    ? "paymentMethod active"
                    : "paymentMethod"
                }
                aria-pressed={selectedMethod === method}
                disabled={busy || !!pending}
                onClick={() => {
                  setPaymentMethod(method);
                  requestKey.current = crypto.randomUUID();
                }}
              >
                <DeviceMobile aria-hidden="true" size={18} />
                {method === "YAPE" ? "Yape" : "Plin"}
              </button>
            ))}
          </div>
          <label className="reservationPolicy">
            <input
              type="checkbox"
              checked={accepted}
              disabled={busy}
              onChange={(event) => setAccepted(event.target.checked)}
            />
            <span>
              Acepto que puedo cancelar hasta 2 horas antes y que no hay
              devoluciones de ningún importe pagado.
            </span>
          </label>
          <button
            className="primary"
            type="button"
            disabled={busy || !accepted || !checkoutReady}
            onClick={() => void pay()}
          >
            {busy
              ? "Verificando pago…"
              : !checkoutReady
                ? "Preparando pago seguro…"
                : `${pending ? "Retomar" : "Simular"} pago de ${money(amount)}`}
          </button>
          {!checkoutReady && simulation !== false && (
            <div className="checkoutPreparation" role="status">
              <span>Verificando tu reserva antes de habilitar el pago…</span>
              <button
                className="secondary"
                disabled={busy}
                onClick={() => setCheckoutRefresh((current) => current + 1)}
                type="button"
              >
                Reintentar verificación
              </button>
            </div>
          )}
          {simulation === false && (
            <p role="status">
              Los pagos están deshabilitados en este ambiente.
            </p>
          )}
        </div>
      )}
      {((temporary && !expired) || balancePayment) && (
        <div className="mobileReservationAction">
          <span>
            <small>{balancePayment ? "Saldo pendiente" : "Paga ahora"}</small>
            <strong>{money(amount)}</strong>
          </span>
          <button
            aria-busy={busy}
            disabled={busy || !accepted || !checkoutReady}
            onClick={() => void pay()}
            type="button"
          >
            {busy
              ? "Verificando…"
              : !checkoutReady
                ? "Preparando…"
                : `${pending ? "Retomar" : "Simular"} pago`}
          </button>
        </div>
      )}
      {reservation.status === "CONFIRMED" && paid > 0 && (
        <p className="successNotice" role="status">
          <CheckCircle aria-hidden="true" size={18} />
          Reserva confirmada.{" "}
          {paid < reservation.totalMinor
            ? "Adelanto registrado; puedes completar el saldo."
            : "Pago completo registrado."}
        </p>
      )}
      {checkInPassAvailable && (
        <ReservationQrPass
          accessToken={accessToken}
          reservationId={reservation.id}
          completed={reservation.status === "COMPLETED"}
        />
      )}
      <p className="muted">
        Cancelación hasta{" "}
        {reservationDate(
          new Date(
            new Date(reservation.startsAt).getTime() - 7200000,
          ).toISOString(),
        )}
        ,{" "}
        {reservationTime(
          new Date(
            new Date(reservation.startsAt).getTime() - 7200000,
          ).toISOString(),
        )}
        . No hay devoluciones.
      </p>
      {!expired && canPlayerCancel(reservation, now) && (
        <div className="checkoutActions">
          {confirmCancel ? (
            <div>
              <p>
                ¿Cancelar esta reserva? El horario se liberará y se retendrán{" "}
                {money(paid)}.
              </p>
              <button
                className="secondary"
                type="button"
                disabled={busy}
                onClick={() => setConfirmCancel(false)}
              >
                Conservar reserva
              </button>
              <button
                className="secondary"
                type="button"
                disabled={busy}
                onClick={() => void cancel()}
              >
                Confirmar cancelación
              </button>
            </div>
          ) : (
            <button
              className="secondary"
              type="button"
              disabled={busy}
              onClick={() => setConfirmCancel(true)}
            >
              Cancelar reserva
            </button>
          )}
        </div>
      )}
    </section>
  );
}
