"use client";
import {
  ExternalPaymentPanel,
  useExternalPayments,
  type ExternalProof,
} from "@/features/payments/ExternalPaymentPanel";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
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
import { FormSheet } from "@/components/forms/FormSheet";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import styles from "./MatchOrganizerDashboard.module.css";
import {
  organizerPaymentParticipants,
  organizerPendingProofs,
} from "./organizer-summary";
import { FloatingNotice } from "@/components/feedback/FloatingNotice";
import { useUserCapabilities } from "@/features/access/useUserCapabilities";
import { useAuth } from "@/features/auth/AuthProvider";
import { apiRequest } from "@/lib/api";
import {
  isProtectedOrganizerRow,
  summarizeMatchFinances,
} from "./presentation";
import type {
  MatchInvitation,
  MatchParticipantAdmin,
  MatchSummary,
} from "./types";
import { MatchCheckInScanner } from "./MatchCheckInScanner";

export function MatchOrganizerDashboard({
  embedded = false,
}: { embedded?: boolean } = {}) {
  const Root = embedded ? "div" : "main";
  const { accessToken, login } = useAuth();
  const { capabilities, loading: capabilitiesLoading } = useUserCapabilities();
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [people, setPeople] = useState<Record<string, MatchParticipantAdmin[]>>(
    {},
  );
  const [invitations, setInvitations] = useState<
    Record<string, MatchInvitation[]>
  >({});
  const [inviteEmails, setInviteEmails] = useState<Record<string, string>>({});
  const [inviting, setInviting] = useState("");
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState("roster");
  const [now, setNow] = useState(() => Date.now());
  const [updatingPayment, setUpdatingPayment] = useState("");
  const externalPayments = useExternalPayments();
  const [proofs, setProofs] = useState<Record<string, ExternalProof[]> | null>(
    null,
  );
  const [proofError, setProofError] = useState(false);
  const [proofRefresh, setProofRefresh] = useState(0);
  const proofMatchIds = matches
    .filter((match) => match.priceMinor > 0 && match.status !== "DRAFT")
    .map((match) => match.id)
    .sort()
    .join(",");

  useEffect(() => {
    if (!externalPayments || !accessToken || loading) return;
    const controller = new AbortController();
    let running = false;
    async function loadProofs() {
      if (running) return;
      running = true;
      try {
        const entries = await Promise.all(
          proofMatchIds
            .split(",")
            .filter(Boolean)
            .map(
              async (matchId) =>
                [
                  matchId,
                  await apiRequest<ExternalProof[]>(
                    `/external-payments?targetType=MATCH&targetId=${encodeURIComponent(matchId)}`,
                    accessToken,
                    { signal: controller.signal },
                  ),
                ] as const,
            ),
        );
        if (!controller.signal.aborted) {
          setProofs(Object.fromEntries(entries));
          setProofError(false);
        }
      } catch {
        if (!controller.signal.aborted) setProofError(true);
      } finally {
        running = false;
      }
    }
    void loadProofs();
    const timer = window.setInterval(() => void loadProofs(), 8000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [externalPayments, accessToken, loading, proofMatchIds, proofRefresh]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  function selectCategory(id: string) {
    setCategory(id);
    setSelectedMatchId(null);
  }

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
          Object.fromEntries(
            entries.map(([matchId, roster]) => [matchId, roster]),
          ),
        );
        setInvitations(
          Object.fromEntries(
            entries.map(([matchId, , invites]) => [matchId, invites]),
          ),
        );
      })
      .catch((reason) => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : "No pudimos cargar el panel.",
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

  async function refreshMatchPayments(matchId: string) {
    if (!accessToken) return;
    setProofRefresh((value) => value + 1);
    try {
      const [roster, updatedMatches] = await Promise.all([
        apiRequest<MatchParticipantAdmin[]>(
          `/matches/${matchId}/participants`,
          accessToken,
        ),
        apiRequest<MatchSummary[]>("/matches/mine", accessToken),
      ]);
      setPeople((current) => ({ ...current, [matchId]: roster }));
      const updated = updatedMatches.find((item) => item.id === matchId);
      if (updated)
        setMatches((current) =>
          current.map((item) => (item.id === matchId ? updated : item)),
        );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No se pudo actualizar el resumen del partido.",
      );
    }
  }

  const financeByMatch = useMemo(
    () =>
      Object.fromEntries(
        matches.map((match) => [
          match.id,
          summarizeMatchFinances(people[match.id] ?? [], match.priceMinor),
        ]),
      ),
    [matches, people],
  );
  const collectedMinor = Object.values(financeByMatch).reduce(
    (sum, finance) => sum + finance.collectedMinor,
    0,
  );
  const pendingMinor = Object.values(financeByMatch).reduce(
    (sum, finance) => sum + finance.pendingMinor,
    0,
  );
  const formatAmount = (amount: number) =>
    new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(amount / 100);

  const paymentCategories = [
    {
      id: "paid",
      label: "Pagos registrados",
      statuses: ["PAID", "PAID_DIRECT"],
    },
    { id: "debt", label: "Deuda pendiente", statuses: ["PENDING", "UNPAID"] },
  ];
  const paymentFilter = paymentCategories.find((item) => item.id === category);
  function filteredRoster(matchId: string) {
    const roster = people[matchId] ?? [];
    return paymentFilter
      ? organizerPaymentParticipants(roster, paymentFilter.statuses)
      : roster;
  }
  const matchCategories = [
    {
      id: "all",
      label: "Todos los partidos",
      description: "Historial completo",
      test: () => true,
    },
    {
      id: "upcoming",
      label: "Próximos",
      description: "Publicados por iniciar",
      test: (match: MatchSummary) =>
        match.status === "PUBLISHED" &&
        new Date(match.startsAt).getTime() > now,
    },
    {
      id: "published",
      label: "Publicados",
      description: "Incluye partidos anteriores",
      test: (match: MatchSummary) => match.status === "PUBLISHED",
    },
    {
      id: "draft",
      label: "Borradores",
      test: (match: MatchSummary) => match.status === "DRAFT",
    },
    {
      id: "cancelled",
      label: "Cancelados",
      test: (match: MatchSummary) => match.status === "CANCELLED",
    },
  ];
  const matchFilter = matchCategories.find((item) => item.id === category);
  const filteredMatches = matches.filter((match) =>
    category === "review"
      ? !proofError &&
        organizerPendingProofs(proofs?.[match.id] ?? []).length > 0
      : paymentFilter
        ? filteredRoster(match.id).length > 0
        : (matchFilter?.test(match) ?? true),
  );
  const sheetTitle =
    category === "review"
      ? "Por confirmar pago"
      : (paymentFilter?.label ?? matchFilter?.label ?? "Tus partidos");

  async function updateDirectPayment(
    matchId: string,
    participant: MatchParticipantAdmin,
  ) {
    if (!accessToken || participant.source !== "MANUAL") return;
    setUpdatingPayment(participant.participantId);
    setError("");
    try {
      await apiRequest(
        `/matches/${matchId}/manual-participants/${participant.participantId}/payment`,
        accessToken,
        {
          method: "PATCH",
          body: JSON.stringify({
            paid: participant.paymentStatus !== "PAID_DIRECT",
          }),
        },
      );
      await refreshMatchPayments(matchId);
      setNotice("Estado del pago directo actualizado.");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No pudimos actualizar el pago directo.",
      );
    } finally {
      setUpdatingPayment("");
    }
  }

  async function removeParticipant(
    matchId: string,
    participant: MatchParticipantAdmin,
  ) {
    if (!accessToken) return;
    if (isProtectedOrganizerRow(participant)) return;
    setRemoving(`${matchId}:${participant.participantId}`);
    setError("");
    try {
      await apiRequest<void>(
        participant.source === "MANUAL"
          ? `/matches/${matchId}/manual-participants/${participant.participantId}`
          : `/matches/${matchId}/participants/${participant.userId}`,
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
        reason instanceof Error
          ? reason.message
          : "No pudimos crear la invitación.",
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
        reason instanceof Error
          ? reason.message
          : "No pudimos revocar la invitación.",
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

  async function copyRoster(
    match: MatchSummary,
    roster: MatchParticipantAdmin[],
  ) {
    const price = new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: match.currency,
    }).format(match.priceMinor / 100);
    const finance = summarizeMatchFinances(roster, match.priceMinor);
    const paid = [...finance.paidOnline, ...finance.paidDirect];
    const pending = finance.pending;
    const lines = [
      `⚽ LA CHANCHA PICHANGUERA · PULSO PIURA`,
      `${match.title}`,
      `📍 ${match.venueName} · ${match.spaceName}`,
      `🗓 ${new Date(match.startsAt).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" })}`,
      `💰 Cuota por persona: ${price}`,
      "",
      `✅ PAGARON (${paid.length})`,
      ...(paid.length
        ? paid.map((person) => `• ${person.displayName}`)
        : ["• Ningún pago registrado"]),
      "",
      `⏳ PENDIENTES (${pending.length})`,
      ...(pending.length
        ? pending.map((person) => `• ${person.displayName}`)
        : ["• Sin pendientes"]),
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
        <button
          className="primary"
          onClick={() => void login(false, "/organizador")}
        >
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
    <Root
      className={embedded ? "organizerDashboard" : "section organizerDashboard"}
    >
      <div className="dashboardHeading">
        <div>
          <p className="eyebrow">MI ORGANIZACIÓN</p>
          {embedded ? (
            <h2>Partidos creados por ti</h2>
          ) : (
            <h1>Panel de partidos</h1>
          )}
          <p className="pageLead">
            Controla cupos, participantes y pagos registrados.
          </p>
        </div>
        {!embedded && (
          <Link className="primary" href="/crear">
            <PlusCircle size={20} />
            Crear partido
          </Link>
        )}
      </div>

      {error && <p className="inlineAlert errorNotice">{error}</p>}
      {loading ? (
        <p className="notice">Preparando tu panel…</p>
      ) : (
        <>
          <section aria-label="Resumen de partidos">
            <h3>Tus partidos</h3>
            <SummaryCards
              items={matchCategories.map(
                ({ id, label, description, test }) => ({
                  id,
                  label,
                  description,
                  value: matches.filter(test).length,
                }),
              )}
              selectedId={category}
              onSelect={selectCategory}
            />
          </section>
          <section aria-label="Resumen de pagos">
            <h3>Pagos y comprobantes</h3>
            <SummaryCards
              items={[
                ...(externalPayments
                  ? [
                      {
                        id: "review",
                        label: "Por confirmar pago",
                        value: proofError
                          ? "No disponible"
                          : proofs === null
                            ? "Cargando…"
                            : Object.values(proofs).reduce(
                                (count, items) =>
                                  count + organizerPendingProofs(items).length,
                                0,
                              ),
                        description: "Comprobantes pendientes de revisión",
                      },
                    ]
                  : []),
                ...paymentCategories.map(({ id, label, statuses }) => ({
                  id,
                  label,
                  value: Object.values(people).reduce(
                    (count, roster) =>
                      count +
                      organizerPaymentParticipants(roster, statuses).length,
                    0,
                  ),
                  description:
                    id === "debt"
                      ? `${formatAmount(pendingMinor)} por cobrar · cupos confirmados`
                      : `${formatAmount(collectedMinor)} recaudados · incluye pagos directos`,
                })),
              ]}
              selectedId={category}
              onSelect={selectCategory}
            />
          </section>

          {externalPayments && proofError && (
            <p className="inlineAlert errorNotice">
              No pudimos consultar los comprobantes.{" "}
              <button
                className="secondary"
                type="button"
                onClick={() => setProofRefresh((value) => value + 1)}
              >
                Reintentar
              </button>
            </p>
          )}

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

          <FormSheet
            open={category !== null}
            title={sheetTitle}
            onClose={() => {
              setCategory(null);
              setSelectedMatchId(null);
            }}
          >
            {error && (
              <p className="inlineAlert errorNotice" role="alert">
                {error}
              </p>
            )}
            {notice && (
              <p className="notice" role="status">
                {notice}
              </p>
            )}
            {category === "review" && proofError && (
              <p className="inlineAlert errorNotice" role="alert">
                Comprobantes no disponibles.{" "}
                <button
                  className="secondary"
                  type="button"
                  onClick={() => setProofRefresh((value) => value + 1)}
                >
                  Reintentar
                </button>
              </p>
            )}
            {category === "review" && proofs === null && !proofError && (
              <p className="notice">Consultando comprobantes…</p>
            )}
            {selectedMatchId ? (
              <button
                className="secondary"
                type="button"
                onClick={() => setSelectedMatchId(null)}
              >
                ← Volver a la lista
              </button>
            ) : (
              <div className={styles.matchList}>
                {filteredMatches.map((match) => (
                  <button
                    className={styles.matchRow}
                    type="button"
                    key={match.id}
                    onClick={() => {
                      setSelectedMatchId(match.id);
                      setDetailTab(
                        category === "review" ? "payments" : "roster",
                      );
                    }}
                  >
                    <span>
                      <strong>{match.title}</strong>
                      <small>
                        {match.venueName} · {match.spaceName}
                      </small>
                      <small>
                        {new Date(match.startsAt).toLocaleString("es-PE", {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: "America/Lima",
                        })}
                      </small>
                    </span>
                    <span>
                      <small>
                        {category === "review"
                          ? `${organizerPendingProofs(proofs?.[match.id] ?? []).length} comprobantes por revisar`
                          : paymentFilter
                            ? `${filteredRoster(match.id).length} participantes`
                            : match.status === "DRAFT"
                              ? "Borrador"
                              : match.status === "CANCELLED"
                                ? "Cancelado"
                                : "Publicado"}
                      </small>
                      <strong>Gestionar →</strong>
                    </span>
                  </button>
                ))}
                {!filteredMatches.length &&
                  !(
                    category === "review" &&
                    (proofError || proofs === null)
                  ) && (
                    <p className="emptyRows">
                      No hay partidos en esta categoría.
                    </p>
                  )}
              </div>
            )}
            <section className={styles.detail}>
              {matches
                .filter((match) => match.id === selectedMatchId)
                .map((match) => {
                  const roster = people[match.id] ?? [];
                  const finance =
                    financeByMatch[match.id] ??
                    summarizeMatchFinances([], match.priceMinor);
                  const matchInvitations = invitations[match.id] ?? [];
                  const joined = finance.confirmed.length;
                  const waitlisted = roster.filter(
                    (participant) => participant.status === "WAITLISTED",
                  ).length;
                  const payments = [
                    ...finance.paidOnline,
                    ...finance.paidDirect,
                  ];
                  const revenue = finance.collectedMinor;
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
                        <Link href={`/partidos/${match.publicSlug}`}>
                          Ver publicación
                        </Link>
                      </header>
                      <section
                        className="organizerMatchMetrics"
                        aria-label={`Métricas de ${match.title}`}
                      >
                        <div>
                          <UsersThree />
                          <span>Confirmados</span>
                          <strong>
                            {joined}/{match.maxPlayers}
                          </strong>
                        </div>
                        <div>
                          <Clock />
                          <span>En espera</span>
                          <strong>{waitlisted}</strong>
                        </div>
                        <div>
                          <CheckCircle />
                          <span>Pagos</span>
                          <strong>{payments.length}</strong>
                        </div>
                        <div>
                          <CurrencyCircleDollar />
                          <span>Ingresos</span>
                          <strong>
                            {new Intl.NumberFormat("es-PE", {
                              style: "currency",
                              currency: "PEN",
                            }).format(revenue / 100)}
                          </strong>
                        </div>
                      </section>
                      <div className="organizerShareActions">
                        <button
                          className="secondary"
                          onClick={() => void copyRoster(match, roster)}
                          type="button"
                        >
                          <CopySimple aria-hidden="true" /> Copiar lista
                        </button>
                        <button
                          className="organizerWhatsapp"
                          onClick={() => sharePublicMatch(match)}
                          type="button"
                        >
                          <WhatsappLogo aria-hidden="true" /> Invitar por
                          WhatsApp
                        </button>
                      </div>
                      <div
                        className={styles.tabs}
                        role="group"
                        aria-label="Gestión del partido"
                      >
                        {[
                          { id: "roster", label: "Participantes" },
                          { id: "payments", label: "Revisar pagos" },
                          { id: "invitations", label: "Invitaciones" },
                          { id: "checkin", label: "Asistencia" },
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            className="secondary"
                            type="button"
                            aria-pressed={detailTab === tab.id}
                            onClick={() => setDetailTab(tab.id)}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                      {detailTab === "payments" && (
                        <ExternalPaymentPanel
                          accessToken={accessToken}
                          targetType="MATCH"
                          targetId={match.id}
                          onChange={() => void refreshMatchPayments(match.id)}
                          reviewer
                          allowUpload={false}
                        />
                      )}
                      {detailTab === "checkin" && (
                        <MatchCheckInScanner
                          accessToken={accessToken}
                          matchId={match.id}
                          onCheckedIn={() => {
                            void apiRequest<MatchParticipantAdmin[]>(
                              `/matches/${match.id}/participants`,
                              accessToken,
                            ).then((updated) =>
                              setPeople((current) => ({
                                ...current,
                                [match.id]: updated,
                              })),
                            );
                          }}
                        />
                      )}
                      {detailTab === "invitations" && (
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
                          <form
                            noValidate
                            onSubmit={(event) => void invite(event, match.id)}
                          >
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
                              {inviting === match.id
                                ? "Creando…"
                                : "Crear invitación"}
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
                                      onClick={() =>
                                        void copyInvitation(invitation.id)
                                      }
                                      type="button"
                                    >
                                      <CopySimple /> Copiar enlace
                                    </button>
                                    <button
                                      className="secondary"
                                      onClick={() =>
                                        shareInvitation(match, invitation.id)
                                      }
                                      type="button"
                                    >
                                      <WhatsappLogo /> WhatsApp
                                    </button>
                                    <button
                                      className="participantRemove"
                                      disabled={
                                        inviting ===
                                        `${match.id}:${invitation.id}`
                                      }
                                      onClick={() =>
                                        void revokeInvitation(
                                          match.id,
                                          invitation.id,
                                        )
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
                              <p className="emptyRows">
                                Todavía no creaste invitaciones.
                              </p>
                            )}
                          </div>
                        </section>
                      )}
                      {detailTab === "roster" && (
                        <div className="participantTable">
                          <h3>
                            {paymentFilter
                              ? paymentFilter.label
                              : "Todos los participantes"}
                          </h3>
                          <div className="participantRow participantHead">
                            <span>Jugador</span>
                            <span>Pago</span>
                            <span>Llegada</span>
                            <span>Acción</span>
                          </div>
                          {filteredRoster(match.id).map((participant) => (
                            <div
                              className="participantRow"
                              key={participant.participantId}
                            >
                              <span className="participantIdentity">
                                <i
                                  aria-label={`Foto de ${participant.displayName}`}
                                  style={
                                    participant.avatarUrl
                                      ? {
                                          backgroundImage: `url(${participant.avatarUrl})`,
                                        }
                                      : undefined
                                  }
                                >
                                  {!participant.avatarUrl &&
                                    participant.displayName
                                      .slice(0, 1)
                                      .toUpperCase()}
                                </i>
                                <span>
                                  <strong>{participant.displayName}</strong>
                                  <small>
                                    {participant.source === "ORGANIZER"
                                      ? "Organizador participante"
                                      : participant.source === "MANUAL"
                                        ? participant.email ||
                                          "Agregado por el organizador"
                                        : participant.email}
                                  </small>
                                  <em>
                                    {participant.status === "JOINED"
                                      ? "Cupo confirmado"
                                      : "Lista de espera"}
                                  </em>
                                </span>
                              </span>
                              <span
                                className={`participantPayment ${participant.paymentStatus === "PAID" || participant.paymentStatus === "PAID_DIRECT" ? "paid" : ""}`}
                              >
                                <strong>
                                  {participant.paymentStatus === "PAID" ||
                                  participant.paymentStatus === "PAID_DIRECT"
                                    ? new Intl.NumberFormat("es-PE", {
                                        style: "currency",
                                        currency: "PEN",
                                      }).format(participant.paidMinor / 100)
                                    : participant.paymentStatus ===
                                        "NOT_REQUIRED"
                                      ? "Sin costo"
                                      : "Pendiente"}
                                </strong>
                                <small>
                                  {participant.paidAt
                                    ? `${participant.paymentMethod} · ${new Date(participant.paidAt).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}`
                                    : "Sin pago registrado"}
                                </small>
                              </span>
                              <span className="participantJoined">
                                <strong>
                                  {participant.checkedInAt
                                    ? "Presente"
                                    : "Pendiente"}
                                </strong>
                                <small>
                                  {participant.checkedInAt
                                    ? new Date(
                                        participant.checkedInAt,
                                      ).toLocaleString("es-PE", {
                                        dateStyle: "short",
                                        timeStyle: "short",
                                      })
                                    : "Sin validar"}
                                </small>
                              </span>
                              <span>
                                {participant.source === "MANUAL" &&
                                  participant.paymentStatus !== "PAID" && (
                                    <button
                                      className="secondary"
                                      type="button"
                                      disabled={
                                        updatingPayment ===
                                        participant.participantId
                                      }
                                      onClick={() =>
                                        void updateDirectPayment(
                                          match.id,
                                          participant,
                                        )
                                      }
                                    >
                                      {updatingPayment ===
                                      participant.participantId
                                        ? "Actualizando…"
                                        : participant.paymentStatus ===
                                            "PAID_DIRECT"
                                          ? "Marcar pendiente"
                                          : "Registrar pago directo"}
                                    </button>
                                  )}
                                {isProtectedOrganizerRow(participant) ? (
                                  <small className="lockedParticipant">
                                    <ShieldCheck /> Organizador protegido
                                  </small>
                                ) : participant.paymentStatus === "PAID" &&
                                  participant.source === "ACCOUNT" ? (
                                  <small className="lockedParticipant">
                                    <ShieldCheck /> Pago protegido
                                  </small>
                                ) : (
                                  <button
                                    className="participantRemove"
                                    disabled={
                                      removing ===
                                      `${match.id}:${participant.participantId}`
                                    }
                                    onClick={() =>
                                      void removeParticipant(
                                        match.id,
                                        participant,
                                      )
                                    }
                                    type="button"
                                  >
                                    <UserMinus />
                                    {removing ===
                                    `${match.id}:${participant.participantId}`
                                      ? "Retirando…"
                                      : "Retirar"}
                                  </button>
                                )}
                              </span>
                            </div>
                          ))}
                          {!filteredRoster(match.id).length && (
                            <p className="emptyRows">
                              No hay participantes en esta categoría.
                            </p>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
            </section>
          </FormSheet>
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
    </Root>
  );
}
