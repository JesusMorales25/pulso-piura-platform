"use client";

import { CheckCircle, CopySimple, QrCode, ShieldCheck } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { FloatingNotice } from "@/components/feedback/FloatingNotice";
import { apiRequest } from "@/lib/api";
import { createQrMatrix } from "@/lib/qr-code";

type Pass = {
  reservationId: string;
  payload: string;
  issuedAt: string;
  validUntil: string;
};

export function ReservationQrPass({
  accessToken,
  reservationId,
  completed,
}: {
  accessToken: string;
  reservationId: string;
  completed: boolean;
}) {
  const [pass, setPass] = useState<Pass | null>(null);
  const [busy, setBusy] = useState(!completed);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const inFlight = useRef(false);

  async function showPass() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      setPass(
        await apiRequest<Pass>(
          `/reservations/${reservationId}/check-in-pass`,
          accessToken,
          { method: "POST" },
        ),
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "No se pudo generar el QR.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  useEffect(() => {
    if (completed) return;
    const controller = new AbortController();
    void apiRequest<Pass>(
      `/reservations/${reservationId}/check-in-pass`,
      accessToken,
      { method: "POST", signal: controller.signal },
    )
      .then((value) => {
        if (!controller.signal.aborted) setPass(value);
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "No se pudo generar el QR.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          inFlight.current = false;
          setBusy(false);
        }
      });
    return () => controller.abort();
  }, [accessToken, completed, reservationId]);

  if (completed)
    return (
      <div className="checkInCompleted" role="status">
        <CheckCircle size={22} weight="fill" aria-hidden="true" />
        <span>
          <strong>Llegada registrada</strong>
          El complejo cerró correctamente esta reserva.
        </span>
      </div>
    );

  const matrix = pass ? createQrMatrix(pass.payload) : null;
  return (
    <section className="reservationPass" aria-labelledby={`pass-${reservationId}`}>
      <div>
        <p className="eyebrow">PASE DE LLEGADA</p>
        <h4 id={`pass-${reservationId}`}>Tu QR de reserva</h4>
        <p className="muted">
          Muéstralo en portería para validar tu llegada y cerrar el servicio.
        </p>
      </div>
      {matrix && pass ? (
        <div className="qrPassBody">
          <svg
            className="qrImage"
            viewBox={`-4 -4 ${matrix.length + 8} ${matrix.length + 8}`}
            role="img"
            aria-label="Código QR único de esta reserva"
            shapeRendering="crispEdges"
          >
            <rect x="-4" y="-4" width={matrix.length + 8} height={matrix.length + 8} fill="#fff" />
            {matrix.map((row, y) =>
              row.map((dark, x) =>
                dark ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#001622" /> : null,
              ),
            )}
          </svg>
          <div>
            <span className="qrVerifiedLabel"><ShieldCheck weight="fill" /> Pase único y verificado</span>
            <strong>Reserva #{reservationId.slice(0, 8).toUpperCase()}</strong>
            <small>Válido hasta {new Date(pass.validUntil).toLocaleString("es-PE")}</small>
            <button
              className="secondary"
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(pass.payload)
                  .then(() => setNotice("Código manual copiado."))
                  .catch(() => setError("No se pudo copiar el código. Inténtalo nuevamente."));
              }}
            >
              <CopySimple aria-hidden="true" size={18} /> Copiar código manual
            </button>
            <button className="secondary" type="button" disabled={busy} onClick={() => void showPass()}>
              {busy ? "Generando…" : "Regenerar QR"}
            </button>
          </div>
        </div>
      ) : (
        <button className="primary" type="button" disabled={busy} onClick={() => void showPass()}>
          <QrCode size={20} aria-hidden="true" />
          {busy ? "Generando QR…" : "Mostrar mi QR"}
        </button>
      )}
      <FloatingNotice
        message={error || notice}
        onDismiss={() => {
          setError("");
          setNotice("");
        }}
        tone={error ? "error" : "success"}
      />
    </section>
  );
}
