"use client";

import { CheckCircle, CopySimple, QrCode, ShieldCheck } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { FloatingNotice } from "@/components/feedback/FloatingNotice";
import { apiRequest } from "@/lib/api";
import { createQrMatrix } from "@/lib/qr-code";

type Pass = { matchId: string; participantId: string; payload: string; issuedAt: string; validUntil: string };

export function MatchQrPass({ accessToken, publicSlug, checkedInAt }: { accessToken: string; publicSlug: string; checkedInAt: string | null }) {
  const [pass, setPass] = useState<Pass | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  async function issue() {
    if (inFlight.current || checkedInAt) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      setPass(await apiRequest<Pass>(`/matches/${publicSlug}/check-in-pass`, accessToken, { method: "POST" }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo generar el QR del partido.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  if (checkedInAt) return <div className="checkInCompleted" role="status"><CheckCircle size={22} weight="fill"/><span><strong>Ingreso registrado</strong>El organizador validó tu llegada el {new Date(checkedInAt).toLocaleString("es-PE")}.</span></div>;

  const matrix = pass ? createQrMatrix(pass.payload) : null;
  return <section className="reservationPass matchPass" aria-label="Pase de ingreso al partido">
    <div><p className="eyebrow">PASE DEL JUGADOR</p><h4>Tu QR de ingreso</h4><p className="muted">Es único para este partido. Muéstralo al organizador al llegar.</p></div>
    {matrix && pass ? <div className="qrPassBody">
      <svg className="qrImage" viewBox={`-4 -4 ${matrix.length + 8} ${matrix.length + 8}`} role="img" aria-label="Código QR único del jugador" shapeRendering="crispEdges">
        <rect x="-4" y="-4" width={matrix.length + 8} height={matrix.length + 8} fill="#fff" />
        {matrix.map((row, y) => row.map((dark, x) => dark ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#001622" /> : null))}
      </svg>
      <div><span className="qrVerifiedLabel"><ShieldCheck weight="fill"/> Identidad ligada a tu cuenta</span><small>Válido hasta {new Date(pass.validUntil).toLocaleString("es-PE")}</small>
        <button className="secondary" type="button" onClick={() => void navigator.clipboard.writeText(pass.payload).then(() => setMessage("Código manual copiado.")).catch(() => setError("No se pudo copiar el código."))}><CopySimple/> Copiar código</button>
        <button className="secondary" type="button" disabled={busy} onClick={() => void issue()}>{busy ? "Generando…" : "Regenerar QR"}</button>
      </div>
    </div> : <button className="primary" type="button" disabled={busy} onClick={() => void issue()}><QrCode size={20}/>{busy ? "Generando QR…" : "Mostrar mi QR"}</button>}
    <FloatingNotice message={error || message} onDismiss={() => { setError(""); setMessage(""); }} tone={error ? "error" : "success"}/>
  </section>;
}
