"use client";
import Image from "next/image";
import Link from "next/link";
import {
  CalendarBlank,
  CheckCircle,
  CurrencyCircleDollar,
  SoccerBall,
  UsersThree,
  Volleyball,
  Basketball,
  TennisBall,
  Target,
  UserCircle,
} from "@phosphor-icons/react";
import type {
  MatchSummary,
  MatchParticipation,
} from "@/features/matches/types";
import styles from "./FeaturedMatchCard.module.css";

export function FeaturedMatchCard({
  match,
  busy,
  participation,
  onJoin,
}: {
  match: MatchSummary;
  busy: boolean;
  participation: MatchParticipation | null;
  onJoin: () => void;
}) {
  const sports: Record<
    string,
    { label: string; Icon: typeof SoccerBall; image: string }
  > = {
    FOOTBALL: {
      label: "Fútbol",
      Icon: SoccerBall,
      image: "/images/hero-match-football-mixed-night.png",
    },
    VOLLEYBALL: {
      label: "Vóley",
      Icon: Volleyball,
      image: "/images/hero-match-volleyball-night.png",
    },
    BASKETBALL: { label: "Básquet", Icon: Basketball, image: "" },
    PADEL: {
      label: "Pádel",
      Icon: TennisBall,
      image: "/images/hero-venue-padel-night.png",
    },
    FRONTON: { label: "Frontón", Icon: Target, image: "" },
  };
  const sport = sports[match.sportCode] ?? {
    label: match.sportCode,
    Icon: SoccerBall,
    image: "",
  };
  const format = match.formatCode
    .replace(match.sportCode, sport.label)
    .replaceAll("_", " ");
  const date = new Date(match.startsAt);
  const dateFormat = new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    day: "numeric",
    month: "short",
  });
  const day =
    dateFormat.format(date) === dateFormat.format(new Date())
      ? "Hoy"
      : dateFormat.format(date);
  const price = new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: match.currency,
    maximumFractionDigits: match.priceMinor % 100 ? 2 : 0,
  }).format(match.priceMinor / 100);
  const demo = match.publicSlug.endsWith("-demo");
  return (
    <article className={styles.card} aria-labelledby="featured-match-title">
      {sport.image && (
        <Image
          className={styles.photo}
          src={sport.image}
          alt=""
          fill
          sizes="(max-width: 760px) 100vw, 640px"
        />
      )}
      <div className={styles.content}>
        <p className={styles.label}>
          <UsersThree aria-hidden="true" size={14} /> PARTIDO ABIERTO DESTACADO
        </p>
        <div className={styles.heading}>
          <div className={styles.badge}>
            <sport.Icon aria-hidden="true" size={28} />
            <small>{format}</small>
          </div>
          <h2 id="featured-match-title">
            <span>{format}</span>
            <strong>{match.venueName}</strong>
          </h2>
        </div>
        <div className={styles.facts}>
          <div>
            <CalendarBlank aria-hidden="true" />
            <span>
              {day}
              <small>
                {new Intl.DateTimeFormat("es-PE", {
                  timeZone: "America/Lima",
                  hour: "numeric",
                  minute: "2-digit",
                }).format(date)}
              </small>
            </span>
          </div>
          <div>
            <UsersThree aria-hidden="true" />
            <span>
              {match.availablePlayers}
              <small>cupos</small>
            </span>
          </div>
          <div>
            <CurrencyCircleDollar aria-hidden="true" />
            <span>
              {price}
              <small>por persona</small>
            </span>
          </div>
        </div>
        <div className={styles.footer}>
          <div className={styles.organizer}>
            <UserCircle aria-hidden="true" size={34} />
            <span>
              Organizador del partido
              <Link href={`/partidos/${match.publicSlug}`}>Ver detalles</Link>
            </span>
          </div>
          {participation ? (
            <p className={styles.result} role="status">
              <CheckCircle aria-hidden="true" size={18} />
              {participation.status === "JOINED"
                ? "Cupo confirmado"
                : `Lista de espera · ${participation.waitlistPosition}`}
            </p>
          ) : (
            <button
              type="button"
              onClick={onJoin}
              disabled={busy}
              aria-busy={busy}
            >
              {busy
                ? "Reservando…"
                : match.availablePlayers > 0
                  ? "Unirme"
                  : "Lista de espera"}
            </button>
          )}
        </div>
        {demo && (
          <small className={styles.demo}>
            Partido de demostración · sin cobros reales
          </small>
        )}
      </div>
    </article>
  );
}
