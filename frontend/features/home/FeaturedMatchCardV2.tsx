"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarBlank,
  Check,
  Clock,
  ShareNetwork,
  MapPin,
  ShieldCheck,
  SoccerBall,
  UserCircle,
  UsersThree,
} from "@phosphor-icons/react";
import type { MatchParticipation, MatchSummary } from "@/features/matches/types";
import styles from "./FeaturedMatchCardV2.module.css";

const sportLabels: Record<string, string> = {
  FOOTBALL: "Fútbol",
  VOLLEYBALL: "Vóley",
  BASKETBALL: "Básquet",
  PADEL: "Pádel",
  TENNIS: "Tenis",
};

export function FeaturedMatchCardV2({
  match,
  busy,
  participation,
  onJoin,
  featured = true,
}: {
  match: MatchSummary;
  busy: boolean;
  participation: MatchParticipation | null;
  onJoin: () => void;
  featured?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const date = new Date(match.startsAt);
  const occupation = Math.min(100, (match.occupiedPlayers / match.maxPlayers) * 100);
  const price = new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: match.currency,
    maximumFractionDigits: match.priceMinor % 100 ? 2 : 0,
  }).format(match.priceMinor / 100);
  const sport = sportLabels[match.sportCode] || match.sportCode;
  const format = match.formatCode.replaceAll("_", " ").replace(match.sportCode, sport);
  const image = match.sportCode === "VOLLEYBALL"
    ? "/images/hero-match-volleyball-night.png"
    : "/images/hero-match-football-mixed-night.png";

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 2500);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  async function copyMatchLink() {
    try {
      const link = new URL(`/partidos/${match.publicSlug}`, window.location.origin).toString();
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const preview = match.participantPreview ?? [];
  const hiddenConfirmed = Math.max(0, match.occupiedPlayers - preview.length);
  const titleId = `match-card-title-${match.id}`;

  return (
    <article className={styles.card} aria-labelledby={titleId}>
      <div className={styles.hero}>
        <Image className={styles.photo} src={image} alt="" fill priority sizes="(max-width: 760px) 100vw, 760px" />
        <div className={styles.heroShade} />
        <p className={styles.label}><UsersThree aria-hidden="true" size={15} /> {featured ? "Partido abierto destacado" : "Partido abierto"}</p>
        <div className={styles.identity}>
          <span className={styles.sportBadge}><SoccerBall aria-hidden="true" weight="duotone" /><small>{format}</small></span>
          <div><h2 id={titleId}>{match.title}</h2><p><MapPin aria-hidden="true" weight="fill" /> {match.venueName}</p></div>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.facts}>
          <div><CalendarBlank aria-hidden="true" /><span><small>FECHA</small><strong>{date.toLocaleDateString("es-PE", { weekday: "short", day: "numeric", month: "short", timeZone: "America/Lima" })}</strong></span></div>
          <div><Clock aria-hidden="true" /><span><small>HORARIO</small><strong>{date.toLocaleTimeString("es-PE", { hour: "numeric", minute: "2-digit", timeZone: "America/Lima" })}</strong></span></div>
          <div><UsersThree aria-hidden="true" /><span><small>VACANTES</small><strong>{match.availablePlayers} cupos</strong></span></div>
        </div>

        <div className={styles.organizer}>
          <span className={styles.organizerAvatar} style={match.organizerAvatarUrl ? { backgroundImage: `url(${match.organizerAvatarUrl})` } : undefined}>{!match.organizerAvatarUrl && <UserCircle aria-hidden="true" weight="fill" />}</span>
          <span><small>Organiza</small><strong>{match.organizerDisplayName || "Organizador del partido"}</strong><em><ShieldCheck aria-hidden="true" weight="fill" /> Identidad verificada</em></span>
        </div>

        <section className={styles.team} aria-label="Equipo confirmado">
          <div className={styles.teamHeading}><span><UsersThree aria-hidden="true" /> Equipo confirmado</span><strong>{match.occupiedPlayers} / {match.maxPlayers} <small>jugadores</small></strong></div>
          <div className={styles.progress}><i style={{ width: `${occupation}%` }} /></div>
          <div className={styles.players}>
            {preview.slice(0, 6).map((player, index) => <span aria-label={player.displayName} className={styles.playerAvatar} key={`${player.displayName}-${index}`} style={player.avatarUrl ? { backgroundImage: `url(${player.avatarUrl})` } : undefined}>{!player.avatarUrl && player.displayName.slice(0, 1).toUpperCase()}</span>)}
            {hiddenConfirmed > 0 && <span className={styles.morePlayers}>+{hiddenConfirmed}</span>}
            <small>{match.availablePlayers > 0 ? `${match.availablePlayers} cupos libres` : "Equipo completo"}</small>
          </div>
        </section>

        <div className={styles.footer}>
          <div className={styles.price}><small>Cuota por jugador</small><strong>{match.priceMinor > 0 ? price : "Gratis"} <em>{match.priceMinor > 0 ? "/ persona" : ""}</em></strong></div>
          <button aria-label={copied ? "Enlace copiado" : "Compartir enlace del partido"} className={styles.share} onClick={() => void copyMatchLink()} title={copied ? "Enlace copiado" : "Compartir partido"} type="button">{copied ? <Check weight="bold" /> : <ShareNetwork />}</button>
          {participation ? (
            <button className={styles.joined} onClick={onJoin} type="button"><Check weight="bold" /> {participation.status === "JOINED" ? "Inscrito" : `Espera ${participation.waitlistPosition}`}<ArrowRight /></button>
          ) : (
            <button className={styles.join} disabled={busy} onClick={onJoin} type="button">{match.availablePlayers > 0 ? "Unirme" : "Lista de espera"}<ArrowRight aria-hidden="true" weight="bold" /></button>
          )}
          <span aria-live="polite" className={styles.copyStatus}>{copied ? "Enlace copiado" : ""}</span>
        </div>
      </div>
    </article>
  );
}
