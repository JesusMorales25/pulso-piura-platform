"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarDots, CheckCircle, UsersThree } from "@phosphor-icons/react";
import { useAuth } from "@/features/auth/AuthProvider";
import { apiRequest } from "@/lib/api";
import type { Reservation, ReservationPage } from "@/features/reservations/types";
import type { MatchSummary } from "./types";

export function MatchBuilder() {
  const { accessToken, login } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [created, setCreated] = useState<MatchSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!accessToken) return;
    void apiRequest<ReservationPage>("/me/reservations?size=50&page=0", accessToken)
      .then((page) => setReservations(page.items.filter((item) => item.status === "CONFIRMED" && new Date(item.startsAt) > new Date())))
      .catch((reason) => setError(reason instanceof Error ? reason.message : "No pudimos cargar tus reservas."))
      .finally(() => setLoading(false));
  }, [accessToken]);

  const first = useMemo(() => reservations[0]?.id ?? "", [reservations]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) { await login(false, "/crear"); return; }
    const data = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      const draft = await apiRequest<MatchSummary>("/matches", accessToken, {
        method: "POST",
        body: JSON.stringify({
          reservationId: data.get("reservationId"),
          title: data.get("title"),
          skillLevel: data.get("skillLevel"),
          minPlayers: Number(data.get("minPlayers")),
          maxPlayers: Number(data.get("maxPlayers")),
          organizerCounts: data.get("organizerCounts") === "on",
          priceMinor: Math.round(Number(data.get("price")) * 100),
          visibility: "PUBLIC",
          cancellationPolicy: data.get("cancellationPolicy"),
        }),
      });
      const published = await apiRequest<MatchSummary>(`/matches/${draft.id}/publish`, accessToken, { method: "POST" });
      setCreated(published);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No pudimos publicar el partido.");
    } finally { setBusy(false); }
  }

  if (!accessToken) return <main className="section accessDeniedPage"><h1>Organiza un partido</h1><p className="pageLead">Inicia sesión para reservar una cancha y publicar el evento.</p><button className="primary" onClick={() => void login(false, "/crear")}>Iniciar sesión</button></main>;
  if (loading) return <main className="section"><p className="notice">Cargando tus canchas reservadas…</p></main>;
  if (created) return <main className="section createMatchPage"><div className="createSuccess"><CheckCircle size={44} weight="fill" /><h1>Partido publicado</h1><p>{created.title} ya está visible y acepta participantes.</p><div className="buttonRow"><Link className="primary" href={`/partidos/${created.publicSlug}`}>Ver publicación</Link><Link className="secondary" href="/organizador">Ir a mi panel</Link></div></div></main>;

  return <main className="section createMatchPage">
    <p className="eyebrow">ORGANIZAR PARTIDO</p><h1>Publica un evento con cancha confirmada</h1>
    <p className="pageLead">El horario se toma de una reserva pagada para que los jugadores vean información real.</p>
    {error && <p className="inlineAlert errorNotice" role="alert">{error}</p>}
    {!reservations.length ? <div className="detailPanel empty"><CalendarDots size={38} /><h2>Primero reserva una cancha</h2><p>Necesitas una reserva confirmada y futura para publicar un partido.</p><Link className="primary" href="/?mode=venues">Reservar cancha</Link></div> :
    <form className="matchBuilderForm" onSubmit={submit}>
      <label><span><CalendarDots size={17}/> Reserva confirmada</span><select name="reservationId" defaultValue={first} required>{reservations.map((item) => <option key={item.id} value={item.id}>{item.venueName} · {item.spaceName} · {new Date(item.startsAt).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" })}</option>)}</select></label>
      <label><span>Título del partido</span><input name="title" maxLength={120} placeholder="Ej. Fútbol 7 entre amigos" required /></label>
      <div className="formPair"><label><span>Nivel</span><select name="skillLevel" defaultValue="INTERMEDIATE"><option value="BEGINNER">Principiante</option><option value="INTERMEDIATE">Intermedio</option><option value="ADVANCED">Avanzado</option><option value="ALL_LEVELS">Todos los niveles</option></select></label><label><span>Precio por persona (S/)</span><input name="price" type="number" min="0" step="0.5" defaultValue="15" required /></label></div>
      <div className="formPair"><label><span><UsersThree size={17}/> Mínimo</span><input name="minPlayers" type="number" min="2" defaultValue="8" required /></label><label><span>Cupos máximos</span><input name="maxPlayers" type="number" min="2" defaultValue="10" required /></label></div>
      <label className="policyCheck"><input name="organizerCounts" type="checkbox"/><span>Contarme como jugador desde la publicación</span></label>
      <label><span>Política del evento</span><textarea name="cancellationPolicy" maxLength={500} defaultValue="El pago confirma el cupo. No hay devoluciones por retiro del participante." required /></label>
      <button className="primary" disabled={busy} type="submit">{busy ? "Publicando…" : "Publicar partido"}</button>
    </form>}
  </main>;
}
