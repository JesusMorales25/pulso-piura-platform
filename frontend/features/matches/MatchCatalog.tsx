"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Clock, MapPin, SoccerBall, UsersThree } from "@phosphor-icons/react";
import { apiRequest } from "@/lib/api";
import type { MatchSummary } from "./types";

const sports = [{label:"Todos",value:""},{label:"Fútbol",value:"FOOTBALL"},{label:"Vóley",value:"VOLLEYBALL"},{label:"Básquet",value:"BASKETBALL"},{label:"Pádel",value:"PADEL"}];

export function MatchCatalog() {
  const [sport, setSport] = useState(""); const [items, setItems] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => { const controller = new AbortController();
    void apiRequest<MatchSummary[]>(`/matches${sport ? `?sport=${sport}` : ""}`, null, {signal: controller.signal})
      .then(setItems).catch((reason) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "No pudimos cargar los partidos."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort();
  }, [sport]);
  return <main className="section matchCatalogPage"><p className="eyebrow">PARTIDOS ABIERTOS</p><h1>Encuentra tu próximo partido</h1><p className="pageLead">Eventos publicados con cancha confirmada, cupos y precio visible.</p>
    <div className="sportChips matchCatalogFilters">{sports.map((item)=><button key={item.label} className={sport===item.value?"active":""} aria-pressed={sport===item.value} onClick={()=>{setLoading(true);setError("");setSport(item.value)}}>{item.label}</button>)}</div>
    {loading && <p className="notice">Buscando partidos disponibles…</p>}{error && <p className="inlineAlert errorNotice">{error}</p>}
    {!loading && !items.length && <div className="empty"><h2>No hay partidos disponibles</h2><p>Prueba otro deporte o vuelve más tarde.</p></div>}
    <div className="matchCatalogGrid">{items.map((match)=>{const start=new Date(match.startsAt); return <article className="matchCatalogCard" key={match.id}><div className="matchCatalogIcon"><SoccerBall size={32}/></div><div><p className="eyebrow">{match.formatCode.replaceAll("_"," ")}</p><h2>{match.title}</h2><p><MapPin size={16}/>{match.venueName} · {match.spaceName}</p><p><Clock size={16}/>{start.toLocaleString("es-PE",{weekday:"short",day:"numeric",month:"short",hour:"numeric",minute:"2-digit"})}</p><div className="matchCatalogMeta"><span><UsersThree size={17}/>{match.availablePlayers} cupos</span><strong>{new Intl.NumberFormat("es-PE",{style:"currency",currency:match.currency}).format(match.priceMinor/100)}</strong></div><Link className="primary" href={`/partidos/${match.publicSlug}`}>Ver y unirme</Link></div></article>})}</div>
  </main>;
}
