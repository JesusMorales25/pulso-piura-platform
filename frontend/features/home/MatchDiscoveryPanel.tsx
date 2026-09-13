"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Basketball,
  SoccerBall,
  Target,
  TennisBall,
  Volleyball,
} from "@phosphor-icons/react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthProvider";
import { FeaturedMatchCardV2 } from "./FeaturedMatchCardV2";
import { NextMatchCard } from "./NextMatchCard";
import type { MatchParticipation, MatchSummary } from "@/features/matches/types";

const sports = [
  { name: "Fútbol", code: "FOOTBALL", Icon: SoccerBall },
  { name: "Vóley", code: "VOLLEYBALL", Icon: Volleyball },
  { name: "Básquet", code: "BASKETBALL", Icon: Basketball },
  { name: "Frontón", code: "FRONTON", Icon: Target },
  { name: "Pádel", code: "PADEL", Icon: TennisBall },
];
export function MatchDiscoveryPanel() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [sport, setSport] = useState("Fútbol");
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [participation, setParticipation] = useState<MatchParticipation | null>(null);
  const selectedSport = sports.find((item) => item.name === sport)!;
  const featured = matches[0];
  useEffect(() => {
    const controller = new AbortController();
    void apiRequest<MatchSummary[]>(
      `/matches?sport=${selectedSport.code}`,
      null,
      { signal: controller.signal },
    )
      .then((result) => {
        if (!controller.signal.aborted) setMatches(result);
      })
      .catch((reason) => {
        if (controller.signal.aborted) return;
        setMatches([]);
        setError(
          reason instanceof Error
            ? reason.message
            : "No se pudieron cargar los partidos.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [selectedSport.code, retry]);
  useEffect(() => {
    if (!accessToken || !featured) { return; }
    void apiRequest<MatchParticipation | undefined>(
      `/matches/${featured.publicSlug}/participants/me`, accessToken,
    ).then((current) => setParticipation(current ?? null)).catch(() => setParticipation(null));
  }, [accessToken, featured]);
  function selectSport(next: string) {
    if (next === sport) return;
    setLoading(true);
    setError("");
    setMatches([]);
    setParticipation(null);
    setSport(next);
  }
  function join(publicSlug: string) {
    router.push(`/partidos/${publicSlug}`);
  }
  return (
    <section aria-label="Partidos abiertos">
      <div className="sportChips" aria-label="Filtrar por deporte">
        {sports.map(({ name, Icon }) => (
          <button
            aria-pressed={sport === name}
            className={sport === name ? "active" : ""}
            key={name}
            onClick={() => selectSport(name)}
            type="button"
          >
            <Icon aria-hidden="true" size={21} weight="duotone" />
            {name}
          </button>
        ))}
      </div>
      {error && (
        <div className="inlineAlert errorNotice">
          <p role="alert">{error}</p>
          {!featured && (
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setError("");
                setRetry((value) => value + 1);
              }}
            >
              Reintentar
            </button>
          )}
        </div>
      )}
      {loading && (
        <div className="featuredMatchLoading" role="status">
          Cargando partido destacado…
        </div>
      )}
      {!loading && featured && (
        <FeaturedMatchCardV2
          match={featured}
          busy={false}
          participation={participation}
          onJoin={() => void join(featured.publicSlug)}
        />
      )}
      {!loading && !featured && !error && (
        <div className="empty compactEmpty">
          <h3>
            No hay partidos abiertos de {sport.toLocaleLowerCase("es-PE")}
          </h3>
          <p>Prueba otra categoría o vuelve más tarde.</p>
        </div>
      )}
      {matches[1] && <NextMatchCard match={matches[1]} />}
      <Link className="viewAllMatches" href="/partidos">
        Ver todos los partidos <ArrowRight aria-hidden="true" size={18} />
      </Link>
    </section>
  );
}
