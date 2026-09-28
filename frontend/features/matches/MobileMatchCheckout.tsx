"use client";

import { useEffect } from "react";
import { CheckCircle, X } from "@phosphor-icons/react";
import {
  mobileCheckoutStatus,
  type MatchPaymentMethod,
} from "./mobile-checkout";

export function MobileMatchCheckout({
  open,
  price,
  method,
  accepted,
  busy,
  actionLabel,
  onClose,
  onMethodChange,
  onAcceptedChange,
  onSubmit,
}: {
  open: boolean;
  price: string;
  method: MatchPaymentMethod | null;
  accepted: boolean;
  busy: boolean;
  actionLabel: string;
  onClose: () => void;
  onMethodChange: (method: MatchPaymentMethod) => void;
  onAcceptedChange: (accepted: boolean) => void;
  onSubmit: () => void;
}) {
  const status = mobileCheckoutStatus(method, accepted);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="mobileCheckoutBackdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        aria-labelledby="mobile-checkout-title"
        aria-modal="true"
        className="mobileCheckoutSheet"
        role="dialog"
      >
        <header>
          <div>
            <small>CONFIRMA TU CUPO</small>
            <h2 id="mobile-checkout-title">Completa tu reserva</h2>
          </div>
          <button aria-label="Cerrar confirmación" onClick={onClose} type="button">
            <X aria-hidden="true" size={21} weight="bold" />
          </button>
        </header>
        <p className="mobileCheckoutPrice"><span>Total por cupo</span><strong>{price}</strong></p>
        <fieldset className="mobileCheckoutMethods">
          <legend>Método de pago</legend>
          {(["YAPE", "PLIN"] as const).map((item) => (
            <button
              aria-pressed={method === item}
              className={method === item ? "selected" : ""}
              key={item}
              onClick={() => onMethodChange(item)}
              type="button"
            >
              {item === "YAPE" ? "Yape" : "Plin"}
            </button>
          ))}
        </fieldset>
        <label className="checkoutAcceptance mobileCheckoutAcceptance">
          <input
            checked={accepted}
            onChange={(event) => onAcceptedChange(event.target.checked)}
            type="checkbox"
          />
          <span>Acepto la cuota y la política del evento.</span>
        </label>
        <p aria-live="polite" className={status.ready ? "mobileCheckoutReady" : "mobileCheckoutHint"}>
          {status.ready && <CheckCircle aria-hidden="true" weight="fill" />}
          {status.message}
        </p>
        <button
          className="mobileCheckoutSubmit"
          aria-busy={busy}
          disabled={busy || !status.ready}
          onClick={onSubmit}
          type="button"
        >
          {busy ? "Confirmando…" : actionLabel}
        </button>
      </section>
    </div>
  );
}
