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
  Trash,
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
import type { MatchJoinOrder, MatchParticipantAdmin, MatchParticipation, MatchSummary } from "./types";

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

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amountMinor / 100);
}

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
  const [organizerRoster, setOrganizerRoster] = useState<MatchParticipantAdmin[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<MatchParticipantAdmin | null>(null);
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);

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

  useEffect(() => {
    if (!accessToken || !match?.managedByCurrentUser) {
      return;
    }
    const controller = new AbortController();
    void apiRequest<MatchParticipantAdmin[]>(
      `/matches/${match.id}/participants`,
      accessToken,
      { signal: controller.signal },
    )
      .then((roster) => {
        if (!controller.signal.aborted) setOrganizerRoster(roster);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "No pudimos cargar el control de pagos.");
        }
      });
    return () => controller.abort();
  }, [accessToken, match?.id, match?.managedByCurrentUser]);

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
      const [updatedMatch, updatedRoster] = await Promise.all([
        apiRequest<MatchSummary>(`/matches/${publicSlug}`, accessToken),
        apiRequest<MatchParticipantAdmin[]>(`/matches/${match.id}/participants`, accessToken),
      ]);
      setMatch(updatedMatch);
      setOrganizerRoster(updatedRoster);
      setManualSlotOpen(false);
      setManualPaid(false);
      setNotice(`${displayName} fue agregado al equipo.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No pudimos ocupar el cupo.");
    } finally {
      setBusy(false);
    }
  }

  async function refreshOrganizerControl() {
    if (!accessToken || !match) return;
    const [updatedMatch, updatedRoster] = await Promise.all([
      apiRequest<MatchSummary>(`/matches/${publicSlug}`, accessToken),
      apiRequest<MatchParticipantAdmin[]>(`/matches/${match.id}/participants`, accessToken),
    ]);
    setMatch(updatedMatch);
    setOrganizerRoster(updatedRoster);
    setSelectedParticipant((current) => current
      ? updatedRoster.find((participant) => participant.participantId === current.participantId) ?? null
      : null);
  }

  async function updateManualPayment(paid: boolean) {
    if (!accessToken || !match || selectedParticipant?.source !== "MANUAL") return;
    setBusy(true);
    setError("");
    try {
      await apiRequest(
        `/matches/${match.id}/manual-participants/${selectedParticipant.participantId}/payment`,
        accessToken,
        { method: "PATCH", body: JSON.stringify({ paid }) },
      );
      await refreshOrganizerControl();
      setNotice(paid ? "El pago directo quedó registrado." : "El jugador quedó con pago pendiente.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No pudimos actualizar el pago.");
    } finally {
      setBusy(false);
    }
  }

  async function removeManagedParticipant() {
    if (!accessToken || !match || !selectedParticipant) return;
    if (selectedParticipant.source === "ACCOUNT" && !selectedParticipant.userId) return;
    setBusy(true);
    setError("");
    try {
      const path = selectedParticipant.source === "MANUAL"
        ? `/matches/${match.id}/manual-participants/${selectedParticipant.participantId}`
        : `/matches/${match.id}/participants/${selectedParticipant.userId}`;
      const removedName = selectedParticipant.displayName;
      await apiRequest(path, accessToken, { method: "DELETE" });
      setSelectedParticipant(null);
      setConfirmingRemoval(false);
      await refreshOrganizerControl();
      setNotice(`${removedName} fue retirado del partido.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No pudimos retirar al jugador.");
    } finally {
      setBusy(false);
    }
  }

  const playerSlots = useMemo(() => {
    if (!match) return [];
    const slots: Array<{ name: string; avatarUrl: string | null; role: "organizer" | "confirmed" | "vacant"; participant?: MatchParticipantAdmin }> = [];
    if (match.organizerCounts) {
      slots.push({ name: match.organizerDisplayName || "Organizador", avatarUrl: match.organizerAvatarUrl, role: "organizer" });
    }
    const visibleParticipants = match.managedByCurrentUser
      ? organizerRoster.filter((participant) => participant.status === "JOINED")
      : (match.participantPreview ?? []).map((player) => ({ ...player, participantId: "", userId: null, source: "ACCOUNT" as const, email: null, status: "JOINED" as const, paymentStatus: "NOT_REQUIRED" as const, paidMinor: 0, paymentMethod: null, paidAt: null, joinedAt: null, checkedInAt: null }));
    visibleParticipants.forEach((player) => {
      if (slots.length < match.occupiedPlayers) {
        slots.push({ name: player.displayName, avatarUrl: player.avatarUrl, role: "confirmed", participant: player.participantId ? player : undefined });
      }
    });
    while (slots.length < match.occupiedPlayers) slots.push({ name: "Jugador confirmado", avatarUrl: null, role: "confirmed" });
    while (slots.length < match.maxPlayers) slots.push({ name: `Cupo ${slots.length + 1}`, avatarUrl: null, role: "vacant" });
    return slots;
  }, [match, organizerRoster]);

  const finances = useMemo(() => {
    if (!match?.managedByCurrentUser) return null;
    const confirmed = organizerRoster.filter((participant) => participant.status === "JOINED");
    const paidOnline = confirmed.filter((participant) => participant.paymentStatus === "PAID");
    const paidDirect = confirmed.filter((participant) => participant.paymentStatus === "PAID_DIRECT");
    const pending = confirmed.filter((participant) =>
      !["PAID", "PAID_DIRECT", "NOT_REQUIRED"].includes(participant.paymentStatus),
    );
    const onlineMinor = paidOnline.reduce((total, participant) => total + participant.paidMinor, 0);
    const directMinor = paidDirect.reduce((total, participant) => total + participant.paidMinor, 0);
    const expectedMinor = match.priceMinor * confirmed.length;
    return {
      confirmed,
      paidOnline,
      paidDirect,
      pending,
      onlineMinor,
      directMinor,
      collectedMinor: onlineMinor + directMinor,
      expectedMinor,
      pendingMinor: Math.max(0, expectedMinor - onlineMinor - directMinor),
    };
  }, [match, organizerRoster]);

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
  const price = formatMoney(match.priceMinor, match.currency);
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

          {finances && (
            <section className="organizerFinance" aria-labelledby="organizer-finance-title">
              <header>
                <div><p className="eyebrow">CONTROL DEL ORGANIZADOR</p><h2 id="organizer-finance-title">Pagos de la pichanga</h2></div>
                <span>{finances.confirmed.length} cupos controlados</span>
              </header>
              {match.priceMinor > 0 ? (
                <>
                  <div className="organizerFinanceMetrics">
                    <article><small>RECAUDADO</small><strong>{formatMoney(finances.collectedMinor, match.currency)}</strong><span>{finances.paidOnline.length + finances.paidDirect.length} pagaron</span></article>
                    <article><small>POR LA WEB</small><strong>{formatMoney(finances.onlineMinor, match.currency)}</strong><span>{finances.paidOnline.length} pagos</span></article>
                    <article><small>DIRECTO</small><strong>{formatMoney(finances.directMinor, match.currency)}</strong><span>{finances.paidDirect.length} pagos</span></article>
                    <article className={finances.pending.length ? "pending" : "complete"}><small>POR COBRAR</small><strong>{formatMoney(finances.pendingMinor, match.currency)}</strong><span>{finances.pending.length} pendientes</span></article>
                  </div>
                  <div className="organizerFinanceExpected"><span><small>Deberías tener por los confirmados</small><strong>{formatMoney(finances.expectedMinor, match.currency)}</strong></span><div><i style={{ width: `${finances.expectedMinor ? Math.min(100, (finances.collectedMinor / finances.expectedMinor) * 100) : 100}%` }} /></div></div>
                  <div className="organizerPaymentLists">
                    <div><h3>Ya pagaron</h3>{[...finances.paidOnline, ...finances.paidDirect].map((participant) => <p key={participant.participantId}><span><strong>{participant.displayName}</strong><small>{participant.paymentStatus === "PAID" ? "Pago por la web" : "Pago directo"}</small></span><b>{formatMoney(participant.paidMinor, match.currency)}</b></p>)}{!finances.paidOnline.length && !finances.paidDirect.length && <p className="emptyFinanceRow">Todavía no hay pagos registrados.</p>}</div>
                    <div><h3>Deben pagar</h3>{finances.pending.map((participant) => <p key={participant.participantId}><span><strong>{participant.displayName}</strong><small>{participant.source === "MANUAL" && participant.email ? participant.email : "Pago pendiente"}</small></span><b>{formatMoney(match.priceMinor, match.currency)}</b></p>)}{!finances.pending.length && <p className="emptyFinanceRow">Todos los confirmados están al día.</p>}</div>
                  </div>
                </>
              ) : <p className="organizerFreeMatch"><CheckCircle weight="fill" /> Esta pichanga no tiene cuota; ningún participante tiene deuda.</p>}
            </section>
          )}

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
              ) : player.role === "confirmed" && player.participant && match.managedByCurrentUser ? (
                <button
                  aria-label={`Administrar a ${player.name}`}
                  className="confirmed managedPlayerCard"
                  key={`${player.participant.participantId}-${index}`}
                  onClick={() => {
                    setSelectedParticipant(player.participant ?? null);
                    setConfirmingRemoval(false);
                  }}
                  type="button"
                >
                  <span className="playerPortrait" style={player.avatarUrl ? { backgroundImage: `url(${player.avatarUrl})` } : undefined}>{!player.avatarUrl && <b aria-hidden="true">{player.name.slice(0, 1).toUpperCase()}</b>}</span>
                  <strong>{player.name}</strong>
                  <span className="playerCardStatus">
                    <small>Confirmado</small>
                    <small className={["PAID", "PAID_DIRECT", "NOT_REQUIRED"].includes(player.participant.paymentStatus) ? "playerPaymentPaid" : "playerPaymentPending"}>
                      {player.participant.paymentStatus === "PAID" ? "Pagado · web" : player.participant.paymentStatus === "PAID_DIRECT" ? "Pagado · directo" : player.participant.paymentStatus === "NOT_REQUIRED" ? "Sin cuota" : "Pago pendiente"}
                    </small>
                  </span>
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

      {selectedParticipant && (
        <div className="matchDialogBackdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            setSelectedParticipant(null);
            setConfirmingRemoval(false);
          }
        }}>
          <section aria-labelledby="participant-control-title" aria-modal="true" className="manualPlayerDialog participantControlDialog" role="dialog">
            <header>
              <span><UserCircle aria-hidden="true" size={24} /></span>
              <div><p className="eyebrow">CONTROL DEL CUPO</p><h2 id="participant-control-title">{selectedParticipant.displayName}</h2></div>
              <button aria-label="Cerrar control" onClick={() => { setSelectedParticipant(null); setConfirmingRemoval(false); }} type="button"><X /></button>
            </header>

            <div className="participantControlSummary">
              <span className="playerPortrait" style={selectedParticipant.avatarUrl ? { backgroundImage: `url(${selectedParticipant.avatarUrl})` } : undefined}>{!selectedParticipant.avatarUrl && <b aria-hidden="true">{selectedParticipant.displayName.slice(0, 1).toUpperCase()}</b>}</span>
              <div><strong>{selectedParticipant.source === "MANUAL" ? "Agregado por ti" : "Jugador con cuenta"}</strong><small>{selectedParticipant.email || "Sin dato de contacto"}</small></div>
              <b className={["PAID", "PAID_DIRECT", "NOT_REQUIRED"].includes(selectedParticipant.paymentStatus) ? "paid" : "pending"}>
                {selectedParticipant.paymentStatus === "PAID" ? "Pagado por web" : selectedParticipant.paymentStatus === "PAID_DIRECT" ? "Pagado directo" : selectedParticipant.paymentStatus === "NOT_REQUIRED" ? "Sin cuota" : "Pago pendiente"}
              </b>
            </div>

            {selectedParticipant.source === "MANUAL" && match.priceMinor > 0 && (
              <div className="participantPaymentControl">
                <div><strong>Estado del pago</strong><small>Actualiza el registro cuando recibas el pago fuera de la plataforma.</small></div>
                <div role="group" aria-label="Estado del pago directo">
                  <button aria-pressed={!(["PAID", "PAID_DIRECT"].includes(selectedParticipant.paymentStatus))} disabled={busy} onClick={() => void updateManualPayment(false)} type="button">Pendiente</button>
                  <button aria-pressed={selectedParticipant.paymentStatus === "PAID_DIRECT"} disabled={busy} onClick={() => void updateManualPayment(true)} type="button">Pagado directo</button>
                </div>
              </div>
            )}

            {selectedParticipant.paymentStatus === "PAID" ? (
              <p className="protectedPaymentNote"><ShieldCheck weight="fill" /> El pago realizado por la web conserva su trazabilidad. No puede modificarse ni retirarse desde este control.</p>
            ) : confirmingRemoval ? (
              <div className="participantRemovalConfirm" role="alert">
                <p><strong>¿Retirar a {selectedParticipant.displayName}?</strong><small>El cupo volverá a quedar disponible. Si había alguien en espera, ocupará este lugar.</small></p>
                <div><button className="secondary" disabled={busy} onClick={() => setConfirmingRemoval(false)} type="button">Conservar</button><button className="danger" disabled={busy} onClick={() => void removeManagedParticipant()} type="button">{busy ? "Retirando…" : "Sí, retirar"}</button></div>
              </div>
            ) : (
              <button className="participantRemoveButton" disabled={busy} onClick={() => setConfirmingRemoval(true)} type="button"><Trash aria-hidden="true" /> Retirar del partido</button>
            )}
          </section>
        </div>
      )}

      <FloatingNotice message={error || notice} onDismiss={() => { setError(""); setNotice(""); }} tone={error ? "error" : "success"} />
    </main>
  );
}
