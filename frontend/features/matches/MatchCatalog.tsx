"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Clock, MapPin, SoccerBall, UsersThree, X } from "@phosphor-icons/react";
import { CardSkeletons } from "@/features/feedback/CardSkeletons";
import { apiRequest } from "@/lib/api";
import type { MatchSummary } from "./types";

const sports = [
  { label: "Todos", value: "" },
  { label: "Fútbol", value: "FOOTBALL" },
  { label: "Vóley", value: "VOLLEYBALL" },
  { label: "Básquet", value: "BASKETBALL" },
  { label: "Pádel", value: "PADEL" },
];

const localStartHour = (isoValue: string) =>
  Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone: "America/Lima",
    }).format(new Date(isoValue)),
  );

export function MatchCatalog() {
  const [sport, setSport] = useState("");
  const [items, setItems] = useState<MatchSummary[]>([]);
  const [zone, setZone] = useState("");
  const [minimumPlayers, setMinimumPlayers] = useState("");
  const [maximumPrice, setMaximumPrice] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [timeRange, setTimeRange] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void apiRequest<MatchSummary[]>(
      `/matches${sport ? `?sport=${sport}` : ""}`,
      null,
      { signal: controller.signal },
    )
      .then(setItems)
      .catch((reason) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "No pudimos cargar los partidos.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [sport]);

  const zones = useMemo(
    () => Array.from(new Set(items.map((item) => item.venueAddress).filter(Boolean))).sort(),
    [items],
  );
  const teamSizes = useMemo(
    () => Array.from(new Set(items.map((item) => item.maxPlayers))).sort((left, right) => left - right),
    [items],
  );
  const filteredItems = items.filter((item) => {
    const hour = localStartHour(item.startsAt);
    const matchesTime =
      !timeRange ||
      (timeRange === "EARLY"
        ? hour < 20
        : timeRange === "PRIME"
          ? hour >= 20 && hour < 22
          : hour >= 22);
    return (
      (!zone || item.venueAddress === zone) &&
      (!minimumPlayers || item.availablePlayers >= Number(minimumPlayers)) &&
      (!maximumPrice || item.priceMinor <= Number(maximumPrice) * 100) &&
      (!teamSize || item.maxPlayers === Number(teamSize)) &&
      matchesTime
    );
  });
  const hasLocalFilters = Boolean(
    zone || minimumPlayers || maximumPrice || teamSize || timeRange,
  );

  const clearFilters = () => {
    setZone("");
    setMinimumPlayers("");
    setMaximumPrice("");
    setTeamSize("");
    setTimeRange("");
  };

  return (
    <main className="section matchCatalogPage">
      <p className="eyebrow">PARTIDOS ABIERTOS</p>
      <h1>Encuentra tu próximo partido</h1>
      <p className="pageLead">Eventos publicados con cancha confirmada, cupos y precio visible.</p>

      <div className="sportChips matchCatalogFilters">
        {sports.map((item) => (
          <button
            aria-pressed={sport === item.value}
            className={sport === item.value ? "active" : ""}
            key={item.label}
            onClick={() => {
              setLoading(true);
              setError("");
              setSport(item.value);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {!loading && items.length > 0 && (
        <section className="catalogRefinements" aria-label="Afinar resultados">
          <label>
            <span>Zona</span>
            <select value={zone} onChange={(event) => setZone(event.target.value)}>
              <option value="">Todas las zonas</option>
              {zones.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>Cupos que necesitas</span>
            <select value={minimumPlayers} onChange={(event) => setMinimumPlayers(event.target.value)}>
              <option value="">Cualquier cantidad</option>
              {[1, 2, 3, 5].map((amount) => <option key={amount} value={amount}>{amount} o más</option>)}
            </select>
          </label>
          <label>
            <span>Tamaño del partido</span>
            <select value={teamSize} onChange={(event) => setTeamSize(event.target.value)}>
              <option value="">Cualquier tamaño</option>
              {teamSizes.map((size) => <option key={size} value={size}>{size} jugadores</option>)}
            </select>
          </label>
          <label>
            <span>Horario</span>
            <select value={timeRange} onChange={(event) => setTimeRange(event.target.value)}>
              <option value="">Cualquier horario</option>
              <option value="EARLY">Antes de 8 p. m.</option>
              <option value="PRIME">8 a 10 p. m.</option>
              <option value="LATE">Después de 10 p. m.</option>
            </select>
          </label>
          <label>
            <span>Precio máximo</span>
            <select value={maximumPrice} onChange={(event) => setMaximumPrice(event.target.value)}>
              <option value="">Cualquier precio</option>
              {[10, 15, 20, 30].map((price) => <option key={price} value={price}>S/ {price}</option>)}
            </select>
          </label>
          {hasLocalFilters && (
            <button className="clearCatalogFilters" onClick={clearFilters}>
              <X aria-hidden="true" size={16} /> Limpiar
            </button>
          )}
        </section>
      )}

      {loading && <CardSkeletons count={3} label="Buscando partidos disponibles" />}
      {error && <p className="inlineAlert errorNotice">{error}</p>}
      {!loading && items.length === 0 && (
        <div className="empty"><h2>No hay partidos disponibles</h2><p>Prueba otro deporte o vuelve más tarde.</p></div>
      )}
      {!loading && items.length > 0 && filteredItems.length === 0 && (
        <div className="empty"><h2>No encontramos coincidencias</h2><p>Amplía la zona, los cupos, el horario o el precio máximo.</p></div>
      )}

      <div className="matchCatalogGrid">
        {filteredItems.map((match) => {
          const start = new Date(match.startsAt);
          const price = new Intl.NumberFormat("es-PE", {
            style: "currency",
            currency: match.currency,
          }).format(match.priceMinor / 100);
          return (
            <article className="matchCatalogCard" key={match.id}>
              <div className="matchCatalogIcon"><SoccerBall aria-hidden="true" size={32} /></div>
              <div>
                <p className="eyebrow">{match.formatCode.replaceAll("_", " ")}</p>
                <h2>{match.title}</h2>
                <p><MapPin aria-hidden="true" size={16} />{match.venueName} · {match.spaceName}</p>
                <p>
                  <Clock aria-hidden="true" size={16} />
                  {start.toLocaleString("es-PE", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: "America/Lima",
                  })}
                </p>
                <div className="matchCatalogMeta">
                  <span><UsersThree aria-hidden="true" size={17} />{match.availablePlayers} cupos</span>
                  <strong>{price}</strong>
                </div>
                <Link className="primary" href={`/partidos/${match.publicSlug}`}>Ver y unirme</Link>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
