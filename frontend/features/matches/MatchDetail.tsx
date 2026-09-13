"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  MapPin,
  ShieldCheck,
  UsersThree,
  XCircle,
  Wallet,
} from "@phosphor-icons/react";
import { useAuth } from "@/features/auth/AuthProvider";
import { apiRequest } from "@/lib/api";
import type { MatchJoinOrder, MatchParticipation, MatchSummary } from "./types";

export function MatchDetail({ publicSlug }: { publicSlug: string }) {
  const { accessToken, login } = useAuth();
  const [match, setMatch] = useState<MatchSummary | null>(null);
  const [participation, setParticipation] = useState<MatchParticipation | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [method, setMethod] = useState<"YAPE" | "PLIN">("YAPE");
  const [accepted, setAccepted] = useState(false);
  const [order, setOrder] = useState<MatchJoinOrder | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void apiRequest<MatchSummary>(`/matches/${publicSlug}`, null, {
      signal: controller.signal,
    })
      .then(setMatch)
      .catch((reason) => {
        if (!controller.signal.aborted) {
          setError(
            reason instanceof Error
              ? reason.message
              : "No se pudo cargar el partido.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [publicSlug]);

  useEffect(() => {
    if (!accessToken) return;
    void Promise.all([
      apiRequest<MatchJoinOrder | undefined>(`/matches/${publicSlug}/join-orders/me`, accessToken).catch(() => undefined),
      apiRequest<MatchParticipation | undefined>(`/matches/${publicSlug}/participants/me`, accessToken).catch(() => undefined),
    ]).then(([currentOrder, currentParticipation]) => {
      if (currentOrder) setOrder(currentOrder);
      if (currentParticipation) setParticipation(currentParticipation);
    });
  }, [accessToken, publicSlug]);

  async function payAndJoin() {
    if (!accessToken) { await login(false, `/partidos/${publicSlug}`); return; }
    if (!accepted) return;
    setBusy(true); setError("");
    try {
      let pending = order;
      if (!pending) {
        pending = await apiRequest<MatchJoinOrder>(`/matches/${publicSlug}/join-orders`, accessToken, {method:"POST",headers:{"Idempotency-Key":crypto.randomUUID()},body:JSON.stringify({method})});
        setOrder(pending);
      }
      const paid = await apiRequest<MatchJoinOrder>(`/matches/join-orders/${pending.id}/simulate`, accessToken, {method:"POST",headers:{"Idempotency-Key":pending.id}});
      setOrder(paid);
      const [updatedMatch, updatedParticipation] = await Promise.all([
        apiRequest<MatchSummary>(`/matches/${publicSlug}`),
        apiRequest<MatchParticipation>(`/matches/${publicSlug}/participants/me`, accessToken),
      ]);
      setMatch(updatedMatch);
      setParticipation(updatedParticipation);
    } catch(reason) { setError(reason instanceof Error?reason.message:"No pudimos confirmar el pago."); }
    finally { setBusy(false); }
  }

  async function updateParticipation(method: "POST" | "DELETE") {
    if (!accessToken) {
      await login(false, `/partidos/${publicSlug}`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await apiRequest<MatchParticipation>(
        `/matches/${publicSlug}/participants/me`,
        accessToken,
        { method },
      );
      setParticipation(result);
      setMatch((current) =>
        current
          ? {
              ...current,
              occupiedPlayers: result.occupiedPlayers,
              availablePlayers: result.availablePlayers,
            }
          : current,
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No se pudo actualizar tu cupo.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="matchDetailPage">
        <p className="notice">Cargando partido…</p>
      </main>
    );
  }
  if (!match) {
    return (
      <main className="matchDetailPage">
        <div className="empty">
          <h1>Partido no disponible</h1>
          <p>{error || "Este partido ya no está publicado."}</p>
          <Link className="primary" href="/?mode=matches">
            Ver otros partidos
          </Link>
        </div>
      </main>
    );
  }

  const start = new Date(match.startsAt);
  const price = new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: match.currency,
  }).format(match.priceMinor / 100);

  return (
    <main className="matchDetailPage">
      <section className="matchDetailHero">
        <Image
          alt="Partido deportivo nocturno"
          fill
          priority
          sizes="100vw"
          src="/images/hero-football-night.png"
        />
        <div className="matchDetailShade" />
        <Link
          aria-label="Volver al inicio"
          className="backCircle"
          href="/?mode=matches"
        >
          <ArrowLeft aria-hidden="true" size={22} />
        </Link>
        <div>
          <p className="eyebrow">PARTIDO ABIERTO</p>
          <h1>{match.title}</h1>
          <p>
            <MapPin aria-hidden="true" size={18} weight="fill" />{" "}
            {match.venueName}
          </p>
        </div>
      </section>
      <div className="matchDetailContent">
        {error && (
          <p className="inlineAlert errorNotice" role="alert">
            {error}
          </p>
        )}
        <section className="matchDetailGrid">
          <article className="detailPanel">
            <h2>Información del partido</h2>
            <div className="detailFacts">
              <span>
                <Clock aria-hidden="true" size={22} />
                <b>
                  {start.toLocaleDateString("es-PE", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </b>
                <small>
                  {start.toLocaleTimeString("es-PE", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </small>
              </span>
              <span>
                <UsersThree aria-hidden="true" size={22} />
                <b>
                  {match.occupiedPlayers} de {match.maxPlayers} jugadores
                </b>
                <small>{match.availablePlayers} cupos disponibles</small>
              </span>
            </div>
            <h3>Cancha confirmada</h3>
            <ul className="includedList">
              <li>
                <CheckCircle aria-hidden="true" weight="fill" />{" "}
                {match.spaceName}
              </li>
              <li>
                <MapPin aria-hidden="true" weight="fill" /> {match.venueAddress}
              </li>
              <li>
                <ShieldCheck aria-hidden="true" weight="fill" />{" "}
                {match.cancellationPolicy}
              </li>
            </ul>
          </article>
          <aside className="detailBooking">
            <div className="detailPrice">
              <span>Precio por persona</span>
              <strong>{price}</strong>
            </div>
            {participation?.status === "JOINED" ? (
              <>
                <div className="joinSuccess" role="status">
                  <CheckCircle aria-hidden="true" size={22} weight="fill" /> Tu
                  cupo está confirmado
                </div>
                <button
                  className="secondary"
                  aria-busy={busy}
                  disabled={busy}
                  onClick={() => void updateParticipation("DELETE")}
                  type="button"
                >
                  <XCircle aria-hidden="true" size={20} /> Retirarme
                </button>
              </>
            ) : participation?.status === "WAITLISTED" ? (
              <>
                <div className="joinSuccess" role="status">
                  <Clock aria-hidden="true" size={22} /> Lista de espera ·
                  puesto {participation.waitlistPosition}
                </div>
                <button
                  className="secondary"
                  aria-busy={busy}
                  disabled={busy}
                  onClick={() => void updateParticipation("DELETE")}
                  type="button"
                >
                  <XCircle aria-hidden="true" size={20} /> Salir de la espera
                </button>
              </>
            ) : match.priceMinor > 0 ? (
              <div className="matchCheckout">
                <p><Wallet size={20}/> Método de pago</p>
                <div className="paymentMethods">
                  {(["YAPE","PLIN"] as const).map(item=><button key={item} type="button" className={method===item?"selected":""} aria-pressed={method===item} onClick={()=>setMethod(item)}>{item}</button>)}
                </div>
                <div className="simulationNotice"><ShieldCheck size={19}/><span><b>Pago de prueba</b><small>No se realizará ningún cobro real.</small></span></div>
                <label className="checkoutAcceptance"><input type="checkbox" checked={accepted} onChange={event=>setAccepted(event.target.checked)}/><span>Acepto el precio y la política de cancelación del evento.</span></label>
                <button className="joinMatchButton" aria-busy={busy} disabled={busy||!accepted} onClick={()=>void payAndJoin()} type="button"><UsersThree size={24}/><span>{busy?"Confirmando pago…":`Pagar con ${method} y unirme`}</span></button>
              </div>
            ) : (
              <button className="joinMatchButton" aria-busy={busy} disabled={busy} onClick={() => void updateParticipation("POST")} type="button"><UsersThree aria-hidden="true" size={24}/><span>{busy ? "Reservando…" : "Unirme gratis"}</span></button>
            )}
            <small className="bookingHelper">
              {order?.status === "PENDING" ? `Tu cupo está retenido hasta ${new Date(order.expiresAt).toLocaleTimeString("es-PE",{hour:"numeric",minute:"2-digit"})}.` : "La confirmación registra tu cupo y pago de forma atómica."}
            </small>
          </aside>
        </section>
      </div>
    </main>
  );
}
