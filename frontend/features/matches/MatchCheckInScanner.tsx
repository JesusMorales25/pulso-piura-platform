"use client";

import { Camera, CheckCircle, QrCode, X } from "@phosphor-icons/react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/api";

type Result = { matchId: string; participantId: string; playerName: string; playerEmail: string; avatarUrl: string | null; participationStatus: string; paymentStatus: string; paidMinor: number; currency: string; checkedInAt: string | null };
type Detector = { detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>> };

export function MatchCheckInScanner({ matchId, accessToken, onCheckedIn }: { matchId: string; accessToken: string; onCheckedIn: (value: Result) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const payloadRef = useRef("");
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
    stopCamera(); setBusy(true); setError("");
    try {
      const value = await apiRequest<Result>(`/matches/${matchId}/check-in/preview`, accessToken, { method: "POST", body: JSON.stringify({ payload: payload.trim() }) });
      payloadRef.current = payload.trim(); setResult(value);
    } catch (reason) { setResult(null); setError(reason instanceof Error ? reason.message : "No se pudo leer el QR."); }
    finally { setBusy(false); }
  }

  async function startCamera() {
    setError(""); setResult(null);
    const DetectorClass = (window as typeof window & { BarcodeDetector?: new (options: { formats: string[] }) => Detector }).BarcodeDetector;
    if (!navigator.mediaDevices?.getUserMedia || !DetectorClass) { setError("El lector automático no está disponible. Ingresa el código manualmente."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream; await videoRef.current.play(); setScanning(true);
      const detector = new DetectorClass({ formats: ["qr_code"] });
      timerRef.current = window.setInterval(() => { if (videoRef.current) void detector.detect(videoRef.current).then((codes) => { if (codes[0]?.rawValue) void preview(codes[0].rawValue); }).catch(() => undefined); }, 450);
    } catch { stopCamera(); setError("No se pudo acceder a la cámara. Revisa el permiso o usa el código manual."); }
  }

  async function confirm() {
    if (!result || busy) return;
    setBusy(true); setError("");
    try {
      const value = await apiRequest<Result>(`/matches/${matchId}/check-in`, accessToken, { method: "POST", body: JSON.stringify({ payload: payloadRef.current }) });
      setResult(value); onCheckedIn(value);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo registrar el ingreso."); }
    finally { setBusy(false); }
  }

  function reset() { stopCamera(); setResult(null); setManual(""); setError(""); payloadRef.current = ""; }
  function submit(event: FormEvent) { event.preventDefault(); void preview(manual); }

  return <section className="checkInPanel matchCheckInPanel card" aria-label="Control de ingreso del partido">
    <div className="checkInPanelHead"><div><p className="eyebrow">CONTROL DE INGRESO</p><h3>Validar QR de jugador</h3><p className="muted">Comprueba identidad, cupo y pago antes de registrar la llegada.</p></div>
      <button className="secondary" type="button" onClick={() => { setOpen((value) => !value); reset(); }}>{open ? <X/> : <QrCode/>}{open ? "Cerrar" : "Leer QR"}</button></div>
    {open && <div className="checkInWorkspace">
      {!result && <div className="scannerColumn"><div className={`cameraFrame${scanning ? " active" : ""}`}><video ref={videoRef} playsInline muted/><span>Centra el QR del jugador</span></div><button className="secondary" disabled={busy || scanning} onClick={() => void startCamera()} type="button"><Camera/> {scanning ? "Buscando…" : "Activar cámara"}</button>
        <form className="manualQr" onSubmit={submit}><label htmlFor={`match-qr-${matchId}`}>Código manual</label><div><input id={`match-qr-${matchId}`} value={manual} onChange={(event) => setManual(event.target.value)} placeholder="PULSO-MATCH:…" autoComplete="off"/><button className="secondary" disabled={busy || !manual.trim()}>Verificar</button></div></form></div>}
      {result && <article className="checkInResult"><div className="checkInIdentity"><span className="reservationStatus">{result.checkedInAt ? "INGRESO REGISTRADO" : "JUGADOR VERIFICADO"}</span><h3>{result.playerName}</h3><p>{result.playerEmail}</p></div>
        <div className={`paymentVerification ${["PAID", "NOT_REQUIRED"].includes(result.paymentStatus) ? "paid" : "pending"}`}><CheckCircle size={22} weight="fill"/><span><strong>{result.paymentStatus === "PAID" ? "Pago confirmado" : result.paymentStatus === "NOT_REQUIRED" ? "Partido sin costo" : "Pago pendiente"}</strong>{result.paidMinor > 0 ? new Intl.NumberFormat("es-PE", { style: "currency", currency: result.currency }).format(result.paidMinor / 100) : "Cupo confirmado"}</span></div>
        {result.checkedInAt ? <p className="successNotice"><CheckCircle/> Llegada registrada el {new Date(result.checkedInAt).toLocaleString("es-PE")}.</p> : <button className="primary" disabled={busy} onClick={() => void confirm()} type="button">{busy ? "Registrando…" : "Confirmar ingreso"}</button>}
        <button className="secondary" disabled={busy} onClick={reset} type="button">Leer otro QR</button></article>}
      {error && <p className="inlineAlert errorNotice" role="alert">{error}</p>}
    </div>}
  </section>;
}
