"use client";

import { Camera, CheckCircle, QrCode, X } from "@phosphor-icons/react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/api";
import { money, reservationDate, reservationTime } from "./presentation";

type CheckInReservation = {
  reservationId: string;
  venueName: string;
  spaceName: string;
  customerName: string;
  customerEmail: string | null;
  startsAt: string;
  endsAt: string;
  reservationStatus: string;
  totalMinor: number;
  paidMinor: number;
  balanceMinor: number;
  paymentStatus: "PAID" | "PARTIAL" | "PENDING";
  checkedInAt: string | null;
};

type Detector = {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
};

export function ReservationCheckInScanner({
  organizationId,
  accessToken,
  onCheckedIn,
}: {
  organizationId: string;
  accessToken: string;
  onCheckedIn: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState("");
  const [result, setResult] = useState<CheckInReservation | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const payloadRef = useRef("");

  function stopCamera() {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setScanning(false);
  }

  useEffect(() => () => stopCamera(), []);

  async function preview(payload: string) {
    if (!payload.trim() || busy) return;
    stopCamera();
    setBusy(true);
    setError("");
    try {
      const value = await apiRequest<CheckInReservation>(
        `/organizations/${organizationId}/reservations/check-in/preview`,
        accessToken,
        { method: "POST", body: JSON.stringify({ payload: payload.trim() }) },
      );
      payloadRef.current = payload.trim();
      setResult(value);
    } catch (reason) {
      setResult(null);
      setError(reason instanceof Error ? reason.message : "No se pudo leer el QR.");
    } finally {
      setBusy(false);
    }
  }

  async function startCamera() {
    setError("");
    setResult(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Este navegador no permite usar la cámara. Ingresa el código manualmente.");
      return;
    }
    const DetectorClass = (window as typeof window & { BarcodeDetector?: new (options: { formats: string[] }) => Detector }).BarcodeDetector;
    if (!DetectorClass) {
      setError("El lector automático no está disponible en este navegador. Ingresa el código manualmente.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setScanning(true);
      const detector = new DetectorClass({ formats: ["qr_code"] });
      timerRef.current = window.setInterval(() => {
        if (!videoRef.current) return;
        void detector.detect(videoRef.current).then((codes) => {
          const value = codes[0]?.rawValue;
          if (value) void preview(value);
        }).catch(() => undefined);
      }, 450);
    } catch {
      stopCamera();
      setError("No se pudo acceder a la cámara. Revisa el permiso o ingresa el código manualmente.");
    }
  }

  async function confirm() {
    if (!result || busy) return;
    setBusy(true);
    setError("");
    try {
      const checked = await apiRequest<CheckInReservation>(
        `/organizations/${organizationId}/reservations/check-in`,
        accessToken,
        {
          method: "POST",
          headers: { "X-Correlation-Id": crypto.randomUUID() },
          body: JSON.stringify({ payload: payloadRef.current }),
        },
      );
      setResult(checked);
      onCheckedIn();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo confirmar la llegada.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    stopCamera();
    setResult(null);
    setError("");
    setManual("");
    payloadRef.current = "";
  }

  function submitManual(event: FormEvent) {
    event.preventDefault();
    void preview(manual);
  }

  return (
    <section className="checkInPanel card" aria-labelledby="check-in-title">
      <div className="checkInPanelHead">
        <div>
          <p className="eyebrow">CONTROL DE LLEGADA</p>
          <h2 id="check-in-title">Escanear reserva</h2>
          <p className="muted">Verifica al jugador, su cancha y el estado del pago antes de cerrar la atención.</p>
        </div>
        <button className="primary" type="button" onClick={() => { setOpen((value) => !value); reset(); }}>
          {open ? <X size={20} /> : <QrCode size={20} />}
          {open ? "Cerrar lector" : "Leer QR"}
        </button>
      </div>
      {open && (
        <div className="checkInWorkspace">
          {!result && (
            <div className="scannerColumn">
              <div className={`cameraFrame${scanning ? " active" : ""}`}>
                <video ref={videoRef} playsInline muted aria-label="Vista de la cámara para leer el QR" />
                <span>Centra el QR dentro del recuadro</span>
              </div>
              <button className="secondary" type="button" disabled={busy || scanning} onClick={() => void startCamera()}>
                <Camera size={20} /> {scanning ? "Buscando QR…" : "Activar cámara"}
              </button>
              <form className="manualQr" onSubmit={submitManual}>
                <label htmlFor="manual-qr">Código manual</label>
                <div>
                  <input id="manual-qr" value={manual} onChange={(event) => setManual(event.target.value)} placeholder="PULSO-CHECKIN:…" autoComplete="off" />
                  <button className="secondary" disabled={busy || !manual.trim()}>Verificar</button>
                </div>
              </form>
            </div>
          )}
          {result && (
            <article className="checkInResult">
              <div className="checkInIdentity">
                <span className="reservationStatus">{result.reservationStatus === "COMPLETED" ? "ATENCIÓN CERRADA" : "RESERVA VÁLIDA"}</span>
                <h3>{result.customerName}</h3>
                <p>{result.customerEmail ?? "Jugador registrado"}</p>
              </div>
              <dl className="reservationSummary">
                <div><dt>Complejo</dt><dd>{result.venueName}</dd></div>
                <div><dt>Cancha</dt><dd>{result.spaceName}</dd></div>
                <div><dt>Fecha</dt><dd>{reservationDate(result.startsAt)}</dd></div>
                <div><dt>Horario</dt><dd>{reservationTime(result.startsAt)} – {reservationTime(result.endsAt)}</dd></div>
                <div><dt>Pagado</dt><dd>{money(result.paidMinor)}</dd></div>
                <div><dt>Saldo pendiente</dt><dd>{money(result.balanceMinor)}</dd></div>
              </dl>
              <div className={`paymentVerification ${result.balanceMinor === 0 ? "paid" : "pending"}`}>
                {result.balanceMinor === 0 ? <CheckCircle size={22} weight="fill" /> : <QrCode size={22} />}
                <span><strong>{result.balanceMinor === 0 ? "Pago completo" : "Pago parcial"}</strong>{result.balanceMinor === 0 ? "No tiene saldo pendiente." : `Falta cancelar ${money(result.balanceMinor)}.`}</span>
              </div>
              {result.reservationStatus === "COMPLETED" ? (
                <p className="successNotice"><CheckCircle size={20} /> Llegada registrada y servicio cerrado.</p>
              ) : (
                <button className="primary" type="button" disabled={busy} onClick={() => void confirm()}>{busy ? "Confirmando…" : "Confirmar llegada y cerrar reserva"}</button>
              )}
              <button className="secondary" type="button" disabled={busy} onClick={reset}>Escanear otra reserva</button>
            </article>
          )}
          {error && <p className="inlineAlert errorNotice" role="alert">{error}</p>}
        </div>
      )}
    </section>
  );
}
