"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CalendarBlank,
  CheckCircle,
  Clock,
  CopySimple,
  CurrencyCircleDollar,
  MapPin,
  ShareNetwork,
  ShieldCheck,
  UserCircle,
  UserPlus,
  UsersThree,
  WhatsappLogo,
  X,
  XCircle,
} from "@phosphor-icons/react";
import { FloatingNotice } from "@/components/feedback/FloatingNotice";
import { useAuth } from "@/features/auth/AuthProvider";
import { apiRequest } from "@/lib/api";
import type { MatchJoinOrder, MatchParticipation, MatchSummary } from "./types";

const skillLabels: Record<string, string> = {
  BEGINNER: "Principiante",
  INTERMEDIATE: "Intermedio",
  ADVANCED: "Avanzado",
  ALL_LEVELS: "Todos los niveles",
};

const sportLabels: Record<string, string> = {
  FOOTBALL: "Fútbol",
  VOLLEYBALL: "Vóley",
  BASKETBALL: "Básquet",
  PADEL: "Pádel",
  TENNIS: "Tenis",
};

export function MatchDetail({ publicSlug }: { publicSlug: string }) {
  const { accessToken, loading: authLoading, login } = useAuth();
  const [match, setMatch] = useState<MatchSummary | null>(null);
  const [participation, setParticipation] = useState<MatchParticipation | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [method, setMethod] = useState<"YAPE" | "PLIN">("YAPE");
  const [accepted, setAccepted] = useState(false);
  const [order, setOrder] = useState<MatchJoinOrder | null>(null);
  const [manualSlotOpen, setManualSlotOpen] = useState(false);
  const [manualPaid, setManualPaid] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    const controller = new AbortController();
    void apiRequest<MatchSummary>(`/matches/${publicSlug}`, accessToken, { signal: controller.signal })
      .then(setMatch)
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "No se pudo cargar el partido.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [accessToken, authLoading, publicSlug]);

  useEffect(() => {
    if (!accessToken) return;
    const controller = new AbortController();
    void Promise.all([
      apiRequest<MatchJoinOrder | undefined>(`/matches/${publicSlug}/join-orders/me`, accessToken, { signal: controller.signal }).catch(() => undefined),
      apiRequest<MatchParticipation | undefined>(`/matches/${publicSlug}/participants/me`, accessToken, { signal: controller.signal }).catch(() => undefined),
    ]).then(([currentOrder, currentParticipation]) => {
      if (controller.signal.aborted) return;
      if (currentOrder) setOrder(currentOrder);
      if (currentParticipation) setParticipation(currentParticipation);
    });
    return () => controller.abort();
  }, [accessToken, publicSlug]);

  async function payAndJoin() {
    if (!accessToken) {
      await login(false, `/partidos/${publicSlug}`);
      return;
    }
    if (!accepted) return;
    setBusy(true);
    setError("");
    try {
      let pending = order;
      if (!pending) {
        pending = await apiRequest<MatchJoinOrder>(`/matches/${publicSlug}/join-orders`, accessToken, {
          method: "POST",
          headers: { "Idempotency-Key": crypto.randomUUID() },
          body: JSON.stringify({ method }),
        });
        setOrder(pending);
      }
      const paid = await apiRequest<MatchJoinOrder>(`/matches/join-orders/${pending.id}/simulate`, accessToken, {
        method: "POST",
        headers: { "Idempotency-Key": pending.id },
      });
      setOrder(paid);
      const [updatedMatch, updatedParticipation] = await Promise.all([
        apiRequest<MatchSummary>(`/matches/${publicSlug}`, accessToken),
        apiRequest<MatchParticipation>(`/matches/${publicSlug}/participants/me`, accessToken),
      ]);
      setMatch(updatedMatch);
      setParticipation(updatedParticipation);
      setNotice("Tu pago de prueba y tu cupo quedaron confirmados.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No pudimos confirmar el pago.");
    } finally {
      setBusy(false);
    }
  }

  async function updateParticipation(httpMethod: "POST" | "DELETE") {
    if (!accessToken) {
      await login(false, `/partidos/${publicSlug}`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await apiRequest<MatchParticipation>(`/matches/${publicSlug}/participants/me`, accessToken, { method: httpMethod });
      setParticipation(result);
      setMatch((current) => current ? { ...current, occupiedPlayers: result.occupiedPlayers, availablePlayers: result.availablePlayers } : current);
      setNotice(httpMethod === "POST" ? "Tu cupo quedó confirmado." : "Saliste del partido.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo actualizar tu cupo.");
    } finally {
      setBusy(false);
    }
  }

  function matchShareText(value: MatchSummary) {
    const date = new Date(value.startsAt).toLocaleString("es-PE", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "numeric",
      minute: "2-digit",
    });
    return `${value.title}\n${date}\n${value.venueName} · ${value.spaceName}\n${value.availablePlayers} cupos disponibles\n${window.location.href}`;
  }

  function shareOnWhatsApp() {
    if (!match) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(matchShareText(match))}`, "_blank", "noopener,noreferrer");
  }

  async function copyInvitation() {
    if (!match) return;
    try {
      await navigator.clipboard.writeText(matchShareText(match));
      setNotice("Invitación copiada.");
    } catch {
      setError("No se pudo copiar la invitación.");
    }
  }

  async function addManualParticipant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !match?.managedByCurrentUser) return;
    const form = new FormData(event.currentTarget);
    const displayName = String(form.get("displayName") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    if (!displayName) return;
    setBusy(true);
    setError("");
    try {
      await apiRequest(`/matches/${match.id}/manual-participants`, accessToken, {
        method: "POST",
        body: JSON.stringify({ displayName, phone: phone || null, paid: manualPaid }),
      });
      setMatch(await apiRequest<MatchSummary>(`/matches/${publicSlug}`, accessToken));
      setManualSlotOpen(false);
      setManualPaid(false);
      setNotice(`${displayName} fue agregado al equipo.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No pudimos ocupar el cupo.");
    } finally {
      setBusy(false);
    }
  }

  const playerSlots = useMemo(() => {
    if (!match) return [];
    const slots: Array<{ name: string; avatarUrl: string | null; role: "organizer" | "confirmed" | "vacant" }> = [];
    if (match.organizerCounts) {
      slots.push({ name: match.organizerDisplayName || "Organizador", avatarUrl: match.organizerAvatarUrl, role: "organizer" });
    }
    (match.participantPreview ?? []).forEach((player) => {
      if (slots.length < match.occupiedPlayers) {
        slots.push({ name: player.displayName, avatarUrl: player.avatarUrl, role: "confirmed" });
      }
    });
    while (slots.length < match.occupiedPlayers) slots.push({ name: "Jugador confirmado", avatarUrl: null, role: "confirmed" });
    while (slots.length < match.maxPlayers) slots.push({ name: `Cupo ${slots.length + 1}`, avatarUrl: null, role: "vacant" });
    return slots;
  }, [match]);

  if (loading) return <main className="matchDetailPage"><p className="notice">Cargando partido…</p></main>;
  if (!match) {
    return (
      <main className="matchDetailPage">
        <div className="empty">
          <h1>Partido no disponible</h1>
          <p>{error || "Este partido ya no está publicado o requiere una invitación válida."}</p>
          <Link className="primary" href="/?mode=matches">Ver otros partidos</Link>
        </div>
      </main>
    );
  }

  const start = new Date(match.startsAt);
  const end = new Date(match.endsAt);
  const durationMinutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  const price = new Intl.NumberFormat("es-PE", { style: "currency", currency: match.currency, minimumFractionDigits: 0 }).format(match.priceMinor / 100);
  const sportName = sportLabels[match.sportCode] || match.sportCode;
  const formatName = match.formatCode.replaceAll("_", " ").replace(match.sportCode, sportName);
  const knownIncludes = [match.surfaceName, ...(match.amenityNames ?? [])].filter((value): value is string => Boolean(value));

  return (
    <main className="matchDetailPage matchExperiencePage">
      <section className="matchExperienceHero">
        <Image alt="Partido deportivo nocturno" fill priority sizes="100vw" src="/images/hero-football-night.png" />
        <div className="matchExperienceShade" />
        <div className="matchExperienceTags">
          <span>{formatName}</span>
          <span>{skillLabels[match.skillLevel] || match.skillLevel}</span>
          {match.visibility !== "PUBLIC" && <span>{match.visibility === "PRIVATE" ? "Privado" : "Con invitación"}</span>}
        </div>
        <Link aria-label="Cerrar detalle" className="matchExperienceClose" href="/?mode=matches"><X aria-hidden="true" size={18} /></Link>
        <div className="matchExperienceTitle">
          <p>{match.visibility === "PUBLIC" ? "PARTIDO ABIERTO" : "CONVOCATORIA PRIVADA"}</p>
          <h1>{match.title}</h1>
          <span><MapPin aria-hidden="true" weight="fill" /> {match.venueName} · {match.venueAddress}</span>
        </div>
      </section>

      <div className="matchExperienceLayout">
        <div className="matchExperienceMain">
          <section className="matchExperienceFacts" aria-label="Datos del partido">
            <article><Clock /><span><small>HORARIO</small><strong>{start.toLocaleTimeString("es-PE", { hour: "numeric", minute: "2-digit" })}</strong><em>{durationMinutes} min</em></span></article>
            <article><CalendarBlank /><span><small>FECHA</small><strong>{start.toLocaleDateString("es-PE", { weekday: "short", day: "numeric", month: "short" })}</strong><em>{start.getFullYear()}</em></span></article>
            <article><UsersThree /><span><small>VACANTES</small><strong>{match.availablePlayers} / {match.maxPlayers}</strong><em>{match.occupiedPlayers} confirmados</em></span></article>
            <article><CurrencyCircleDollar /><span><small>CUOTA POR JUGADOR</small><strong>{match.priceMinor > 0 ? price : "Gratis"}</strong><em>{match.priceMinor > 0 ? "Yape / Plin" : "Sin pago"}</em></span></article>
          </section>

          <section className="matchTacticalBoard" aria-labelledby="match-board-title">
            <header><div><p className="eyebrow">EQUIPO</p><h2 id="match-board-title">Pizarra de convocados</h2></div><span><b>{match.occupiedPlayers}</b> listos</span></header>
            <div className="matchPlayerGrid">
              {playerSlots.map((player, index) => player.role === "vacant" && match.managedByCurrentUser ? (
                <button
                  aria-label={`Agregar persona al cupo ${index + 1}`}
                  className="vacant manualSlotButton"
                  key={`${player.role}-${index}`}
                  onClick={() => setManualSlotOpen(true)}
                  type="button"
                >
                  <span className="vacantNumber">+{index + 1}</span>
                  <strong>{player.name}</strong>
                  <small>Agregar persona</small>
                </button>
              ) : (
                <article className={player.role === "vacant" ? "vacant" : "confirmed"} key={`${player.role}-${index}`}>
                  {player.role === "vacant" ? <span className="vacantNumber">+{index + 1}</span> : <span className="playerPortrait" style={player.avatarUrl ? { backgroundImage: `url(${player.avatarUrl})` } : undefined}>{!player.avatarUrl && <b aria-hidden="true">{player.name.slice(0, 1).toUpperCase()}</b>}</span>}
                  <strong>{player.name}</strong>
                  <small>{player.role === "organizer" ? "Organizador" : player.role === "vacant" ? "Cupo libre" : "Confirmado"}</small>
                </article>
              ))}
            </div>
            <p className="matchBoardProgress"><span style={{ width: `${Math.min(100, (match.occupiedPlayers / match.maxPlayers) * 100)}%` }} /></p>
            <small>El partido se confirma con {match.minPlayers} jugadores.</small>
          </section>

          <section className="matchIncludes" aria-labelledby="match-includes-title">
            <p className="eyebrow">QUÉ INCLUYE ESTA PICHANGA</p>
            <h2 id="match-includes-title">Cancha y servicios confirmados</h2>
            <ul>
              <li><CheckCircle weight="fill" /><span><strong>{match.spaceName}</strong><small>Cancha reservada para este horario</small></span></li>
              {knownIncludes.map((item) => <li key={item}><CheckCircle weight="fill" /><span><strong>{item}</strong><small>Incluido por el complejo</small></span></li>)}
              <li><ShieldCheck weight="fill" /><span><strong>Regla de cancelación</strong><small>{match.cancellationPolicy}</small></span></li>
            </ul>
          </section>

          <section className="matchOrganizerCard">
            <span className="organizerPortrait" style={match.organizerAvatarUrl ? { backgroundImage: `url(${match.organizerAvatarUrl})` } : undefined}>{!match.organizerAvatarUrl && <UserCircle weight="fill" />}</span>
            <div><strong>{match.organizerDisplayName || "Organizador del partido"}</strong><small>Organiza esta convocatoria</small><b><ShieldCheck weight="fill" /> Identidad verificada</b></div>
          </section>

          <section className="matchShareCard">
            <ShareNetwork aria-hidden="true" size={24} />
            <div><strong>¿Falta completar el equipo?</strong><small>Comparte esta convocatoria con tus amigos.</small></div>
            <button className="secondary" onClick={() => void copyInvitation()} type="button"><CopySimple /> Copiar</button>
            <button className="matchWhatsappButton" onClick={shareOnWhatsApp} type="button"><WhatsappLogo weight="fill" /> WhatsApp</button>
          </section>
        </div>

        <aside className="matchExperienceBooking">
          <div className="detailPrice"><span>Total por cupo</span><strong>{match.priceMinor > 0 ? price : "Gratis"}</strong></div>
          {participation?.status === "JOINED" ? (
            <><div className="joinSuccess" role="status"><CheckCircle size={22} weight="fill" /> Tu cupo está confirmado</div><button className="secondary" aria-busy={busy} disabled={busy} onClick={() => void updateParticipation("DELETE")} type="button"><XCircle size={20} /> Retirarme</button></>
          ) : participation?.status === "WAITLISTED" ? (
            <><div className="joinSuccess" role="status"><Clock size={22} /> Lista de espera · puesto {participation.waitlistPosition}</div><button className="secondary" aria-busy={busy} disabled={busy} onClick={() => void updateParticipation("DELETE")} type="button"><XCircle size={20} /> Salir de la espera</button></>
          ) : match.availablePlayers === 0 ? (
            <button className="joinMatchButton" aria-busy={busy} disabled={busy} onClick={() => void updateParticipation("POST")} type="button"><UsersThree size={22} /><span>{busy ? "Registrando…" : "Unirme a la espera"}</span></button>
          ) : match.priceMinor > 0 ? (
            <div className="matchCheckout">
              <p><span>Método de pago</span><small>Simulación sin cobro real</small></p>
              <div className="paymentMethods" role="group" aria-label="Método de pago">{(["YAPE", "PLIN"] as const).map((item) => <button aria-pressed={method === item} className={method === item ? "selected" : ""} key={item} onClick={() => setMethod(item)} type="button">{item === "YAPE" ? "Yape" : "Plin"}</button>)}</div>
              <label className="checkoutAcceptance"><input checked={accepted} onChange={(event) => setAccepted(event.target.checked)} type="checkbox" /><span>Acepto la cuota y la política del evento.</span></label>
              <button className="joinMatchButton" aria-busy={busy} disabled={busy || !accepted} onClick={() => void payAndJoin()} type="button"><UsersThree size={22} /><span>{busy ? "Confirmando…" : "Reservar mi cupo"}</span></button>
            </div>
          ) : (
            <button className="joinMatchButton" aria-busy={busy} disabled={busy} onClick={() => void updateParticipation("POST")} type="button"><UsersThree size={22} /><span>{busy ? "Reservando…" : match.availablePlayers === 0 ? "Unirme a la espera" : "Reservar mi cupo"}</span></button>
          )}
          <small className="bookingHelper">{order?.status === "PENDING" ? `Cupo retenido hasta ${new Date(order.expiresAt).toLocaleTimeString("es-PE", { hour: "numeric", minute: "2-digit" })}.` : "Tu registro y pago se confirman en una sola operación."}</small>
        </aside>
      </div>

      {participation?.status !== "JOINED" && participation?.status !== "WAITLISTED" && (
        <div className="mobileMatchAction matchExperienceMobileAction"><span><small>Total por cupo</small><strong>{match.priceMinor > 0 ? price : "Gratis"}</strong></span><button aria-busy={busy} disabled={busy || (match.availablePlayers > 0 && match.priceMinor > 0 && !accepted)} onClick={() => void (match.availablePlayers === 0 || match.priceMinor === 0 ? updateParticipation("POST") : payAndJoin())} type="button">{busy ? "Confirmando…" : match.availablePlayers === 0 ? "Unirme a la espera" : "Reservar mi cupo"}</button></div>
      )}

      {manualSlotOpen && (
        <div className="matchDialogBackdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setManualSlotOpen(false);
        }}>
          <section aria-labelledby="manual-player-title" aria-modal="true" className="manualPlayerDialog" role="dialog">
            <header>
              <span><UserPlus aria-hidden="true" size={22} /></span>
              <div><p className="eyebrow">OCUPAR CUPO</p><h2 id="manual-player-title">Agregar persona</h2></div>
              <button aria-label="Cerrar formulario" onClick={() => setManualSlotOpen(false)} type="button"><X /></button>
            </header>
            <p>Registra a quien te confirmó directamente y no usará una cuenta para este partido.</p>
            <form onSubmit={(event) => void addManualParticipant(event)}>
              <label>Nombre de la persona<input autoComplete="name" autoFocus maxLength={120} name="displayName" placeholder="Ej. Carlos Ramírez" required /></label>
              <label>Celular <small>Opcional, no será público</small><input autoComplete="tel" inputMode="tel" maxLength={30} name="phone" placeholder="Ej. 987 654 321" type="tel" /></label>
              <label className="manualPaymentCheck"><input checked={manualPaid} onChange={(event) => setManualPaid(event.target.checked)} type="checkbox" /><span><strong>Ya pagó directamente</strong><small>Marca esta opción si recibiste el Yape, Plin o pago fuera de la plataforma.</small></span></label>
              <div className="manualPlayerActions"><button className="secondary" onClick={() => setManualSlotOpen(false)} type="button">Cancelar</button><button className="primary borderless" disabled={busy} type="submit">{busy ? "Agregando…" : "Agregar al equipo"}</button></div>
            </form>
          </section>
        </div>
      )}

      <FloatingNotice message={error || notice} onDismiss={() => { setError(""); setNotice(""); }} tone={error ? "error" : "success"} />
    </main>
  );
}
