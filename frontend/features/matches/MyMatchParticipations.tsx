"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarDots, CheckCircle, MapPin, UsersThree } from "@phosphor-icons/react";
import { useAuth } from "@/features/auth/AuthProvider";
import { apiRequest } from "@/lib/api";

type MatchActivity = {
  id: string; publicSlug: string; title: string; formatCode: string;
  spaceName: string; venueName: string; venueAddress: string;
  startsAt: string; endsAt: string; participationStatus: "JOINED" | "WAITLISTED";
  paymentStatus: "PAID" | "PENDING" | "UNPAID" | "NOT_REQUIRED";
  paidMinor: number; currency: string;
};

export function MyMatchParticipations() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<MatchActivity[]>([]);
  const [loading, setLoading] = useState(Boolean(accessToken));
  const [error, setError] = useState("");
  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    void apiRequest<MatchActivity[]>("/matches/participations/me", accessToken)
      .then((result) => { if (active) setItems(result); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "No pudimos cargar tus partidos."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [accessToken]);
  if (!accessToken) return null;
  return <section className="activityMatches" aria-labelledby="my-matches-title">
    <div className="activitySectionTitle"><div><p className="eyebrow">MIS INSCRIPCIONES</p><h2 id="my-matches-title">Partidos</h2></div><Link href="/partidos">Buscar partidos</Link></div>
    {loading && <p className="notice">Cargando tus inscripciones…</p>}
    {error && <p className="inlineAlert errorNotice" role="alert">{error}</p>}
    {!loading && !items.length && <div className="empty compactEmpty"><UsersThree size={34}/><h3>Aún no te has unido a un partido</h3><p>Cuando confirmes un cupo aparecerá aquí.</p></div>}
    <div className="activityMatchList">{items.map((item) => { const start = new Date(item.startsAt); return <Link className="activityMatchCard" href={`/partidos/${item.publicSlug}`} key={item.id}>
      <div className="activityMatchDate"><strong>{start.toLocaleDateString("es-PE",{day:"2-digit"})}</strong><span>{start.toLocaleDateString("es-PE",{month:"short"})}</span></div>
      <div><h3>{item.title}</h3><p><MapPin size={15}/>{item.venueName} · {item.spaceName}</p><p><CalendarDots size={15}/>{start.toLocaleString("es-PE",{dateStyle:"medium",timeStyle:"short"})}</p></div>
      <span className="activityMatchStatus"><CheckCircle size={17}/>{item.participationStatus === "JOINED" ? "Confirmado" : "En espera"}<small>{item.paymentStatus === "PAID" ? "Pagado" : item.paymentStatus === "NOT_REQUIRED" ? "Sin costo" : "Pago pendiente"}</small></span>
    </Link>; })}</div>
  </section>;
}
