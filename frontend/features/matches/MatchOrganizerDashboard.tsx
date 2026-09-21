"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CalendarDots,
  CurrencyCircleDollar,
  CheckCircle,
  Clock,
  CopySimple,
  PlusCircle,
  PaperPlaneTilt,
  ShieldCheck,
  UserMinus,
  UsersThree,
  WhatsappLogo,
} from "@phosphor-icons/react";
import { FloatingNotice } from "@/components/feedback/FloatingNotice";
import { useUserCapabilities } from "@/features/access/useUserCapabilities";
import { useAuth } from "@/features/auth/AuthProvider";
import { apiRequest } from "@/lib/api";
import type {
  MatchInvitation,
  MatchParticipantAdmin,
  MatchSummary,
} from "./types";
import { MatchCheckInScanner } from "./MatchCheckInScanner";

export function MatchOrganizerDashboard() {
  const { accessToken, login } = useAuth();
  const { capabilities, loading: capabilitiesLoading } = useUserCapabilities();
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [people, setPeople] = useState<Record<string, MatchParticipantAdmin[]>>({});
  const [invitations, setInvitations] = useState<Record<string, MatchInvitation[]>>({});
  const [inviteEmails, setInviteEmails] = useState<Record<string, string>>({});
  const [inviting, setInviting] = useState("");
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

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
                await apiRequest<MatchInvitation[]>(
                  `/matches/${match.id}/invitations`,
                  accessToken,
                ),
              ] as const,
          ),
        );
        if (!active) return;
        setMatches(result);
        setPeople(
          Object.fromEntries(entries.map(([matchId, roster]) => [matchId, roster])),
        );
        setInvitations(
          Object.fromEntries(entries.map(([matchId, , invites]) => [matchId, invites])),
        );
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

  async function invite(event: FormEvent<HTMLFormElement>, matchId: string) {
    event.preventDefault();
    if (!accessToken) return;
    const email = inviteEmails[matchId]?.trim();
    if (!email) return;
    setInviting(matchId);
    setError("");
    try {
      const created = await apiRequest<MatchInvitation>(
        `/matches/${matchId}/invitations`,
        accessToken,
        { method: "POST", body: JSON.stringify({ email }) },
      );
      setInvitations((current) => ({
        ...current,
        [matchId]: [
          created,
          ...(current[matchId] ?? []).filter((item) => item.id !== created.id),
        ],
      }));
      setInviteEmails((current) => ({ ...current, [matchId]: "" }));
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "No pudimos crear la invitación.",
      );
    } finally {
      setInviting("");
    }
  }

  async function revokeInvitation(matchId: string, invitationId: string) {
    if (!accessToken) return;
    setInviting(`${matchId}:${invitationId}`);
    setError("");
    try {
      await apiRequest<void>(
        `/matches/${matchId}/invitations/${invitationId}`,
        accessToken,
        { method: "DELETE" },
      );
      setInvitations((current) => ({
        ...current,
        [matchId]: (current[matchId] ?? []).map((item) =>
          item.id === invitationId ? { ...item, status: "REVOKED" } : item,
        ),
      }));
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "No pudimos revocar la invitación.",
      );
    } finally {
      setInviting("");
    }
  }

  async function copyInvitation(invitationId: string) {
    const url = `${window.location.origin}/partidos/invitaciones/${invitationId}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const field = document.createElement("textarea");
      field.value = url;
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      document.execCommand("copy");
      field.remove();
    }
    setNotice("Enlace de invitación copiado.");
  }

  function shareInvitation(match: MatchSummary, invitationId: string) {
    const url = `${window.location.origin}/partidos/invitaciones/${invitationId}`;
    const startsAt = new Date(match.startsAt).toLocaleString("es-PE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    const price = new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: match.currency,
    }).format(match.priceMinor / 100);
    const message = [
      `¡Te invito a ${match.title}!`,
      `🗓 ${startsAt}`,
      `📍 ${match.venueName} · ${match.spaceName}`,
      `💰 Cuota: ${price}`,
      `⚽ Quedan ${match.availablePlayers} cupos`,
      `Confirma tu invitación aquí: ${url}`,
    ].join("\n");
    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  async function copyRoster(match: MatchSummary, roster: MatchParticipantAdmin[]) {
    const price = new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: match.currency,
    }).format(match.priceMinor / 100);
    const joined = roster.filter((participant) => participant.status === "JOINED");
    const paid = joined.filter((participant) => participant.paymentStatus === "PAID");
    const pending = joined.filter((participant) => participant.paymentStatus !== "PAID");
    const lines = [
      `⚽ LA CHANCHA PICHANGUERA · PULSO PIURA`,
      `${match.title}`,
      `📍 ${match.venueName} · ${match.spaceName}`,
      `🗓 ${new Date(match.startsAt).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" })}`,
      `💰 Cuota por persona: ${price}`,
      "",
      `✅ PAGARON (${paid.length})`,
      ...(paid.length ? paid.map((person) => `• ${person.displayName}`) : ["• Ningún pago registrado"]),
      "",
      `⏳ PENDIENTES (${pending.length})`,
      ...(pending.length ? pending.map((person) => `• ${person.displayName}`) : ["• Sin pendientes"]),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setNotice("Lista de jugadores y pagos copiada.");
    } catch {
      setError("No se pudo copiar la lista. Inténtalo nuevamente.");
    }
  }

  function sharePublicMatch(match: MatchSummary) {
    const url = `${window.location.origin}/partidos/${match.publicSlug}`;
    const price = new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: match.currency,
    }).format(match.priceMinor / 100);
    const message = [
      `⚽ ¡Pichanga abierta en ${match.venueName}!`,
      `🗓 ${new Date(match.startsAt).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" })}`,
      `🏟 ${match.spaceName}`,
      `💰 Cuota: ${price}`,
      `👥 Quedan ${match.availablePlayers} cupos`,
      `Confirma tu cupo aquí: ${url}`,
    ].join("\n");
    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
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
        <p className="eyebrow">MODO ORGANIZADOR</p>
        <h1>Activa las herramientas para organizar</h1>
        <p className="pageLead">
          Con tu correo verificado puedes activar esta función desde el perfil.
          No necesitas esperar aprobación de la plataforma.
        </p>
        <Link className="primary" href="/perfil#capacidades">
          Activar modo organizador
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
              const matchInvitations = invitations[match.id] ?? [];
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
                <div className="organizerShareActions">
                  <button className="secondary" onClick={() => void copyRoster(match, roster)} type="button">
                    <CopySimple aria-hidden="true" /> Copiar lista
                  </button>
                  <button className="organizerWhatsapp" onClick={() => sharePublicMatch(match)} type="button">
                    <WhatsappLogo aria-hidden="true" /> Invitar por WhatsApp
                  </button>
                </div>
                <MatchCheckInScanner
                  accessToken={accessToken}
                  matchId={match.id}
                  onCheckedIn={() => {
                    void apiRequest<MatchParticipantAdmin[]>(
                      `/matches/${match.id}/participants`,
                      accessToken,
                    ).then((updated) => setPeople((current) => ({ ...current, [match.id]: updated })));
                  }}
                />
                <section className="matchInvitationManager">
                  <div>
                    <h3>Invitar jugadores</h3>
                    <span className="pill">
                      {match.visibility === "PRIVATE"
                        ? "Privado"
                        : match.visibility === "LINK"
                          ? "Con enlace"
                          : "Público"}
                    </span>
                  </div>
                  <form noValidate onSubmit={(event) => void invite(event, match.id)}>
                    <label>
                      Correo de la persona
                      <input
                        aria-label={`Correo para invitar a ${match.title}`}
                        autoComplete="email"
                        onChange={(event) =>
                          setInviteEmails((current) => ({
                            ...current,
                            [match.id]: event.target.value,
                          }))
                        }
                        placeholder="jugador@correo.com"
                        required
                        type="email"
                        value={inviteEmails[match.id] ?? ""}
                      />
                    </label>
                    <button
                      className="secondary"
                      disabled={
                        inviting === match.id ||
                        !inviteEmails[match.id]?.trim()
                      }
                      type="submit"
                    >
                      <PaperPlaneTilt />
                      {inviting === match.id ? "Creando…" : "Crear invitación"}
                    </button>
                  </form>
                  <div className="matchInvitationList">
                    {matchInvitations.map((invitation) => (
                      <div key={invitation.id}>
                        <span>
                          <strong>{invitation.email}</strong>
                          <small>
                            {invitation.status === "PENDING"
                              ? "Pendiente"
                              : invitation.status === "ACCEPTED"
                                ? "Aceptada"
                                : invitation.status === "REVOKED"
                                  ? "Revocada"
                                  : "Vencida"}
                          </small>
                        </span>
                        {invitation.status === "PENDING" && (
                          <span className="buttonRow">
                            <Link
                              className="secondary"
                              href={`/partidos/invitaciones/${invitation.id}`}
                            >
                              Ver
                            </Link>
                            <button
                              className="secondary"
                              onClick={() => void copyInvitation(invitation.id)}
                              type="button"
                            >
                              <CopySimple /> Copiar enlace
                            </button>
                            <button
                              className="secondary"
                              onClick={() => shareInvitation(match, invitation.id)}
                              type="button"
                            >
                              <WhatsappLogo /> WhatsApp
                            </button>
                            <button
                              className="participantRemove"
                              disabled={inviting === `${match.id}:${invitation.id}`}
                              onClick={() =>
                                void revokeInvitation(match.id, invitation.id)
                              }
                              type="button"
                            >
                              Revocar
                            </button>
                          </span>
                        )}
                      </div>
                    ))}
                    {!matchInvitations.length && (
                      <p className="emptyRows">Todavía no creaste invitaciones.</p>
                    )}
                  </div>
                </section>
                <div className="participantTable">
                  <div className="participantRow participantHead">
                    <span>Jugador</span>
                    <span>Pago</span>
                    <span>Llegada</span>
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
                      <span className="participantJoined"><strong>{participant.checkedInAt ? "Presente" : "Pendiente"}</strong><small>{participant.checkedInAt ? new Date(participant.checkedInAt).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" }) : "Sin validar"}</small></span>
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
      <FloatingNotice
        message={notice || error}
        onDismiss={() => {
          setNotice("");
          setError("");
        }}
        tone={error ? "error" : "success"}
      />
    </main>
  );
}
