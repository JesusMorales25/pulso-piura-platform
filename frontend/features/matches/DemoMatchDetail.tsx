"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, CheckCircle, Clock, MapPin, ShieldCheck, Star, UsersThree } from "@phosphor-icons/react";

type DemoMatchDetailProps = { sport?: "football" | "volleyball" };

export function DemoMatchDetail({ sport = "football" }: DemoMatchDetailProps) {
  const [joined, setJoined] = useState(false);
  const isFootball = sport === "football";
  const title = isFootball ? "Fútbol 7 mixto" : "Vóley recreativo";

  return (
    <main className="matchDetailPage">
      <section className="matchDetailHero">
        <Image alt={isFootball ? "Partido de fútbol nocturno" : "Cancha de vóley nocturna"} fill priority sizes="100vw" src={isFootball ? "/images/hero-football-night.png" : "/images/venue-volleyball.png"} />
        <div className="matchDetailShade" />
        <Link aria-label="Volver al inicio" className="backCircle" href="/"><ArrowLeft aria-hidden="true" size={22} /></Link>
        <div><p className="eyebrow">PARTIDO ABIERTO</p><h1>{title}</h1><p><MapPin aria-hidden="true" size={18} weight="fill" /> {isFootball ? "Complejo Deportivo Los Ejidos" : "Urb. Miraflores"}</p></div>
      </section>
      <div className="matchDetailContent">
        <div className="demoBanner" role="note"><ShieldCheck aria-hidden="true" size={20} /> Esta pantalla usa datos temporales para validar la experiencia. Aún no está conectada al módulo de partidos del backend.</div>
        <section className="matchDetailGrid">
          <article className="detailPanel">
            <p className="eyebrow">INFORMACIÓN DEL PARTIDO</p>
            <h2>Todo listo para jugar</h2>
            <div className="detailFacts"><span><Clock aria-hidden="true" size={22} /><b>Sábado 5 de septiembre</b><small>8:00 p. m. · 60 minutos</small></span><span><UsersThree aria-hidden="true" size={22} /><b>{isFootball ? "7 de 10 jugadores" : "4 de 16 jugadores"}</b><small>Nivel intermedio · mixto</small></span></div>
            <h3>Qué incluye</h3>
            <ul className="includedList"><li><CheckCircle aria-hidden="true" weight="fill" /> Cancha e iluminación</li><li><CheckCircle aria-hidden="true" weight="fill" /> Balón del encuentro</li><li><CheckCircle aria-hidden="true" weight="fill" /> Organización y confirmación</li></ul>
          </article>
          <aside className="detailBooking">
            <div className="detailOrganizer"><Image alt="Carlos, organizador" height={58} src="/images/player-carlos-demo.png" width={58} /><span><small>Organiza</small><strong>Carlos R.</strong><b><Star aria-hidden="true" size={14} weight="fill" /> 4.8 · verificado</b></span></div>
            <div className="detailPrice"><span>Precio por persona</span><strong>S/ {isFootball ? "15" : "12"}</strong></div>
            {joined ? <div className="joinSuccess" role="status"><CheckCircle aria-hidden="true" size={22} weight="fill" /> Te uniste a la demostración</div> : <button className="joinMatchButton" onClick={() => setJoined(true)} type="button"><UsersThree aria-hidden="true" size={24} /><span>Reservar mi cupo</span></button>}
            <small className="bookingHelper">No se realizará ningún cobro real.</small>
          </aside>
        </section>
      </div>
    </main>
  );
}
