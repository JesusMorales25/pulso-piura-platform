"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDots,
  CurrencyCircleDollar,
  CheckCircle,
  Clock,
  PlusCircle,
  ShieldCheck,
  UserMinus,
  UsersThree,
} from "@phosphor-icons/react";
import { useUserCapabilities } from "@/features/access/useUserCapabilities";
import { useAuth } from "@/features/auth/AuthProvider";
import { apiRequest } from "@/lib/api";
import type { MatchParticipantAdmin, MatchSummary } from "./types";

export function MatchOrganizerDashboard() {
  const { accessToken, login } = useAuth();
  const { capabilities, loading: capabilitiesLoading } = useUserCapabilities();
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [people, setPeople] = useState<Record<string, MatchParticipantAdmin[]>>({});
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (capabilitiesLoading) return;
    if (!accessToken || !capabilities.canCreateMatches) return;

    let active = true;
    void apiRequest<MatchSummary[]>("/matches/mine", accessToken)
      .then(async (result) => {
        const entries = await Promise.all(
          result.map(
            async (match) =>
              [
                match.id,
                await apiRequest<MatchParticipantAdmin[]>(
                  `/matches/${match.id}/participants`,
                  accessToken,
                ),
              ] as const,
          ),
        );
        if (!active) return;
        setMatches(result);
        setPeople(Object.fromEntries(entries));
      })
      .catch((reason) => {
        if (active) {
          setError(
            reason instanceof Error ? reason.message : "No pudimos cargar el panel.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [accessToken, capabilities.canCreateMatches, capabilitiesLoading]);

  const totals = useMemo(() => Object.values(people).flat(), [people]);
  const paid = totals
    .filter((participant) => participant.paymentStatus === "PAID")
    .reduce((sum, participant) => sum + participant.paidMinor, 0);
  const paidCount = totals.filter(
    (participant) => participant.paymentStatus === "PAID",
  ).length;

  async function removeParticipant(matchId: string, participantId: string) {
    if (!accessToken) return;
    setRemoving(`${matchId}:${participantId}`);
    setError("");
    try {
      await apiRequest<void>(
        `/matches/${matchId}/participants/${participantId}`,
        accessToken,
        { method: "DELETE" },
      );
      const [updatedMatches, updatedRoster] = await Promise.all([
        apiRequest<MatchSummary[]>("/matches/mine", accessToken),
        apiRequest<MatchParticipantAdmin[]>(
          `/matches/${matchId}/participants`,
          accessToken,
        ),
      ]);
      setMatches(updatedMatches);
      setPeople((current) => ({
        ...current,
        [matchId]: updatedRoster,
      }));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No pudimos retirar al participante.",
      );
    } finally {
      setRemoving("");
    }
  }

  if (!accessToken) {
    return (
      <main className="section accessDeniedPage">
        <h1>Panel del organizador</h1>
        <p className="pageLead">Inicia sesión para administrar tus eventos.</p>
        <button className="primary" onClick={() => void login(false, "/organizador")}>
          Iniciar sesión
        </button>
      </main>
    );
  }

  if (capabilitiesLoading) {
    return (
      <main className="section">
        <div className="notice">Validando tus permisos…</div>
      </main>
    );
  }

  if (!capabilities.canCreateMatches) {
    return (
      <main className="section accessDeniedPage">
        <ShieldCheck aria-hidden="true" size={44} weight="duotone" />
        <p className="eyebrow">SOLICITUD DE ORGANIZADOR</p>
        <h1>Tu acceso todavía no está aprobado</h1>
        <p className="pageLead">
          Puedes reservar canchas y unirte a partidos. Envía o revisa tu solicitud
          desde el perfil para habilitar la creación y gestión de eventos.
        </p>
        <Link className="primary" href="/perfil">
          Ver mi solicitud
        </Link>
      </main>
    );
  }

  return (
    <main className="section organizerDashboard">
      <div className="dashboardHeading">
        <div>
          <p className="eyebrow">MI ORGANIZACIÓN</p>
          <h1>Panel de partidos</h1>
          <p className="pageLead">Controla cupos, participantes y pagos registrados.</p>
        </div>
        <Link className="primary" href="/crear">
          <PlusCircle size={20} />
          Crear partido
        </Link>
      </div>

      {error && <p className="inlineAlert errorNotice">{error}</p>}
      {loading ? (
        <p className="notice">Preparando tu panel…</p>
      ) : (
        <>
          <section className="organizerKpis">
            <article>
              <CalendarDots />
              <span>Eventos</span>
              <strong>{matches.length}</strong>
            </article>
            <article>
              <UsersThree />
              <span>Participantes</span>
              <strong>{totals.filter((participant) => participant.status === "JOINED").length}</strong>
            </article>
            <article>
              <CurrencyCircleDollar />
              <span>Ingresos confirmados</span>
              <strong>
                {new Intl.NumberFormat("es-PE", {
                  style: "currency",
                  currency: "PEN",
                }).format(paid / 100)}
              </strong>
              <small>{paidCount} pagos registrados</small>
            </article>
          </section>

          <div className="dashboardActions">
            <Link className="secondary" href="/?mode=venues">
              Reservar una cancha
            </Link>
            <Link className="secondary" href="/partidos">
              Unirme a un partido
            </Link>
          </div>

          {!matches.length && (
            <div className="empty">
              <h2>Aún no publicaste partidos</h2>
              <p>Reserva una cancha confirmada y crea tu primer evento.</p>
            </div>
          )}

          <section className="organizerMatchList">
            {matches.map((match) => {
              const roster = people[match.id] ?? [];
              const joined = roster.filter(
                (participant) => participant.status === "JOINED",
              ).length;
              const waitlisted = roster.filter(
                (participant) => participant.status === "WAITLISTED",
              ).length;
              const payments = roster.filter(
                (participant) => participant.paymentStatus === "PAID",
              );
              const revenue = payments.reduce(
                (sum, participant) => sum + participant.paidMinor,
                0,
              );
              const occupancy = Math.min(
                100,
                Math.round((match.occupiedPlayers / match.maxPlayers) * 100),
              );
              return (
              <article className="organizerMatchCard" key={match.id}>
                <header>
                  <div>
                    <p className="eyebrow">
                      {new Date(match.startsAt).toLocaleString("es-PE", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                    <h2>{match.title}</h2>
                    <span>
                      {match.venueName} · {match.spaceName}
                    </span>
                  </div>
                  <Link href={`/partidos/${match.publicSlug}`}>Ver publicación</Link>
                </header>
                <section className="organizerMatchMetrics" aria-label={`Métricas de ${match.title}`}>
                  <div><UsersThree/><span>Confirmados</span><strong>{joined}/{match.maxPlayers}</strong></div>
                  <div><Clock/><span>En espera</span><strong>{waitlisted}</strong></div>
                  <div><CheckCircle/><span>Pagos</span><strong>{payments.length}</strong></div>
                  <div><CurrencyCircleDollar/><span>Ingresos</span><strong>{new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(revenue / 100)}</strong></div>
                </section>
                <div className="matchOccupancy" aria-label={`${occupancy}% de ocupación`}>
                  <span><b>Ocupación</b><small>{occupancy}% · {match.availablePlayers} cupos libres</small></span>
                  <div><i style={{ width: `${occupancy}%` }} /></div>
                </div>
                <div className="participantTable">
                  <div className="participantRow participantHead">
                    <span>Jugador</span>
                    <span>Pago</span>
                    <span>Registro</span>
                    <span>Acción</span>
                  </div>
                  {roster.map((participant) => (
                    <div className="participantRow" key={participant.userId}>
                      <span className="participantIdentity">
                        <i
                          aria-label={`Foto de ${participant.displayName}`}
                          style={participant.avatarUrl ? { backgroundImage: `url(${participant.avatarUrl})` } : undefined}
                        >{!participant.avatarUrl && participant.displayName.slice(0, 1).toUpperCase()}</i>
                        <span><strong>{participant.displayName}</strong><small>{participant.email}</small><em>{participant.status === "JOINED" ? "Cupo confirmado" : "Lista de espera"}</em></span>
                      </span>
                      <span className={`participantPayment ${participant.paymentStatus === "PAID" ? "paid" : ""}`}>
                        <strong>{participant.paymentStatus === "PAID"
                          ? new Intl.NumberFormat("es-PE", {
                              style: "currency",
                              currency: "PEN",
                            }).format(participant.paidMinor / 100)
                          : participant.paymentStatus === "NOT_REQUIRED"
                            ? "Sin costo"
                            : "Pendiente"}</strong>
                        <small>{participant.paidAt ? `${participant.paymentMethod} · ${new Date(participant.paidAt).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}` : "Sin pago registrado"}</small>
                      </span>
                      <span className="participantJoined"><strong>{participant.joinedAt ? new Date(participant.joinedAt).toLocaleDateString("es-PE", { day: "2-digit", month: "short" }) : "—"}</strong><small>{participant.joinedAt ? new Date(participant.joinedAt).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }) : "Sin fecha"}</small></span>
                      <span>{participant.paymentStatus === "PAID" ? <small className="lockedParticipant"><ShieldCheck/> Pago protegido</small> : <button className="participantRemove" disabled={removing === `${match.id}:${participant.userId}`} onClick={() => void removeParticipant(match.id, participant.userId)} type="button"><UserMinus/>{removing === `${match.id}:${participant.userId}` ? "Retirando…" : "Retirar"}</button>}</span>
                    </div>
                  ))}
                  {!roster.length && (
                    <p className="emptyRows">Todavía no hay participantes.</p>
                  )}
                </div>
              </article>
            )})}
          </section>
        </>
      )}
    </main>
  );
}
