"use client";

import Image from "next/image";
import { useState } from "react";
import { PlusCircle, SoccerBall } from "@phosphor-icons/react";
import { FormSheet } from "@/components/forms/FormSheet";
import { MatchBuilder } from "./MatchBuilder";
import { MatchOrganizerDashboard } from "./MatchOrganizerDashboard";

export function MatchCreationWorkspace() {
  const [tab, setTab] = useState<"mine" | "create">("mine");
  const [open, setOpen] = useState(false);
  const [generation, setGeneration] = useState(0);
  return <main className="section matchCreationWorkspace">
    <header className="hybridHome complexPanelHero">
      <section className="hybridHero">
        <div className="hybridHeroCarousel" aria-hidden="true"><Image src="/images/venue-football-7.png" alt="" fill sizes="(max-width: 760px) 100vw, 1120px" className="hybridHeroImage active" priority /></div>
        <div className="hybridHeroShade" />
        <div className="hybridHeroContent">
          <p className="prototypeGreeting">TUS PICHANGAS</p>
          <h1>Arma el próximo partido</h1>
          <div className="homeModeSwitch complexPanelSwitch" role="group" aria-label="Gestionar partidos">
            <button type="button" className={tab === "mine" ? "active" : ""} aria-pressed={tab === "mine"} onClick={() => setTab("mine")}><SoccerBall size={20} />Partidos creados</button>
            <button type="button" className={tab === "create" ? "active" : ""} aria-pressed={tab === "create"} onClick={() => setTab("create")}><PlusCircle size={20} />Crear partido</button>
          </div>
        </div>
      </section>
    </header>
    {tab === "mine" ? <MatchOrganizerDashboard embedded onCreate={() => setTab("create")} /> : <section className="card matchCreateIntro">
      <p className="eyebrow">NUEVO PARTIDO</p><h2>Convoca a tu equipo</h2>
      <p>Completa los datos y la convocatoria. Después elige tu cancha y publica. Tu avance se guarda como borrador.</p>
      <button className="primary" type="button" onClick={() => setOpen(true)}>Crear o continuar partido</button>
    </section>}
    <FormSheet open={open} title="Crear partido" onClose={() => setOpen(false)}><MatchBuilder key={generation} onPublished={() => { setOpen(false); setTab("mine"); setGeneration((current) => current + 1); }} /></FormSheet>
  </main>;
}
