"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDots,
  CheckCircle,
  Clock,
  CurrencyCircleDollar,
  Eye,
  LinkSimple,
  LockKey,
  MapPin,
  ShieldCheck,
  SoccerBall,
  UsersThree,
} from "@phosphor-icons/react";
import { FloatingNotice } from "@/components/feedback/FloatingNotice";
import { useAuth } from "@/features/auth/AuthProvider";
import type { Reservation, ReservationPage } from "@/features/reservations/types";
import { apiRequest } from "@/lib/api";
import type { MatchSummary } from "./types";

type Visibility = "PUBLIC" | "LINK" | "PRIVATE";
type BuilderStep = 1 | 2 | 3 | 4;

const visibilityOptions: Array<{
  value: Visibility;
  label: string;
  description: string;
  Icon: typeof Eye;
}> = [
  { value: "PUBLIC", label: "Público", description: "Aparece en Buscar partido", Icon: Eye },
  { value: "LINK", label: "Con enlace", description: "Solo quien reciba el enlace", Icon: LinkSimple },
  { value: "PRIVATE", label: "Privado", description: "Solo personas invitadas", Icon: LockKey },
];

function friendlyPublishError(reason: unknown) {
  const fallback = "No pudimos publicar el partido.";
  if (!(reason instanceof Error)) return fallback;
  if (reason.message.toLocaleLowerCase("es-PE").includes("capacidad")) {
    return "La cantidad máxima de jugadores supera la capacidad de esta cancha. Reduce los cupos e inténtalo nuevamente.";
  }
  return reason.message || fallback;
}

export function MatchBuilder() {
  const { accessToken, login } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [created, setCreated] = useState<MatchSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [activeStep, setActiveStep] = useState<BuilderStep>(1);
  const [selectedReservationId, setSelectedReservationId] = useState("");
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("PUBLIC");
  const [skillLevel, setSkillLevel] = useState("INTERMEDIATE");
  const [price, setPrice] = useState("15");
  const [minPlayers, setMinPlayers] = useState("8");
  const [maxPlayers, setMaxPlayers] = useState("10");
  const [organizerCounts, setOrganizerCounts] = useState(false);
  const [cancellationPolicy, setCancellationPolicy] = useState(
    "El pago confirma el cupo. No hay devoluciones por retiro del participante.",
  );

  useEffect(() => {
    if (!accessToken) return;
    const controller = new AbortController();
    void apiRequest<ReservationPage>("/me/reservations?size=50&page=0", accessToken, {
      signal: controller.signal,
    })
      .then((page) => {
        const available = page.items.filter(
          (item) =>
            item.status === "CONFIRMED" &&
            new Date(item.startsAt) > new Date() &&
            !item.matchAssociated,
        );
        setReservations(available);
        setSelectedReservationId((current) => current || available[0]?.id || "");
      })
      .catch((reason) => {
        if (!controller.signal.aborted) {
          setLoadError(
            reason instanceof Error ? reason.message : "No pudimos cargar tus reservas.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [accessToken]);

  const selectedReservation = useMemo(
    () => reservations.find((item) => item.id === selectedReservationId),
    [reservations, selectedReservationId],
  );
  const selectedCapacity = selectedReservation?.spaceCapacity || 0;
  const matchStart = selectedReservation ? new Date(selectedReservation.startsAt) : null;
  const numericPrice = Number(price) || 0;
  const numericMaximum = Number(maxPlayers) || 0;
  const numericMinimum = Number(minPlayers) || 0;

  function stepError(step: BuilderStep) {
    if (step === 1 && !selectedReservationId) {
      return "Selecciona una cancha confirmada para continuar.";
    }
    if (step === 2) {
      if (title.trim().length < 3) return "Escribe un nombre de al menos 3 caracteres.";
      if (!Number.isFinite(Number(price)) || numericPrice < 0) {
        return "Ingresa una cuota válida para el partido.";
      }
    }
    if (step === 3) {
      if (numericMinimum < 2) return "El mínimo debe ser de al menos 2 jugadores.";
      if (numericMaximum < numericMinimum) {
        return "Los cupos máximos deben ser iguales o mayores al mínimo de jugadores.";
      }
      if (selectedCapacity && numericMaximum > selectedCapacity) {
        return `Esta cancha admite como máximo ${selectedCapacity} jugadores.`;
      }
    }
    if (step === 4 && cancellationPolicy.trim().length < 10) {
      return "Describe brevemente la política de cancelación.";
    }
    return "";
  }

  function canOpenStep(target: BuilderStep) {
    for (let step = 1; step < target; step += 1) {
      if (stepError(step as BuilderStep)) return false;
    }
    return true;
  }

  function goToStep(target: BuilderStep) {
    if (target < activeStep || canOpenStep(target)) {
      setNotice("");
      setActiveStep(target);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const firstIncomplete = ([1, 2, 3, 4] as BuilderStep[]).find(
      (step) => step < target && stepError(step),
    );
    setNotice(stepError(firstIncomplete || activeStep));
  }

  function continueToNextStep() {
    const error = stepError(activeStep);
    if (error) {
      setNotice(error);
      return;
    }
    if (activeStep < 4) goToStep((activeStep + 1) as BuilderStep);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) {
      await login(false, "/crear");
      return;
    }
    const error = stepError(4);
    if (!canOpenStep(4) || error) {
      setNotice(error || "Completa los pasos anteriores antes de publicar.");
      return;
    }

    setBusy(true);
    setNotice("");
    try {
      const draft = await apiRequest<MatchSummary>("/matches", accessToken, {
        method: "POST",
        body: JSON.stringify({
          reservationId: selectedReservationId,
          title: title.trim(),
          skillLevel,
          minPlayers: numericMinimum,
          maxPlayers: numericMaximum,
          organizerCounts,
          priceMinor: Math.round(numericPrice * 100),
          visibility,
          cancellationPolicy: cancellationPolicy.trim(),
        }),
      });
      const published = await apiRequest<MatchSummary>(
        `/matches/${draft.id}/publish`,
        accessToken,
        { method: "POST" },
      );
      setCreated(published);
    } catch (reason) {
      setNotice(friendlyPublishError(reason));
    } finally {
      setBusy(false);
    }
  }

  if (!accessToken) {
    return (
      <main className="section accessDeniedPage">
        <h1>Organiza un partido</h1>
        <p className="pageLead">Inicia sesión para reservar una cancha y publicar el evento.</p>
        <button className="primary" onClick={() => void login(false, "/crear")} type="button">
          Iniciar sesión
        </button>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="section createMatchPage">
        <div className="matchComposerSkeleton" aria-label="Preparando el formulario">
          <i /><i /><i />
        </div>
      </main>
    );
  }

  if (created) {
    return (
      <main className="section createMatchPage">
        <div className="createSuccess">
          <CheckCircle size={52} weight="fill" />
          <p className="eyebrow">CONVOCATORIA LISTA</p>
          <h1>Tu pichanga ya está publicada</h1>
          <p>
            {created.title}{" "}
            {created.visibility === "PUBLIC"
              ? "ya aparece en Buscar partido."
              : created.visibility === "LINK"
                ? "está disponible mediante su enlace."
                : "es privada; invita participantes desde tu panel."}
          </p>
          <div className="buttonRow">
            <Link className="primary" href={`/partidos/${created.publicSlug}`}>Ver publicación</Link>
            <Link className="secondary" href="/organizador">Administrar jugadores</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="section createMatchPage">
      <header className="matchComposerHeading">
        <div>
          <p className="eyebrow">ARMAR NUEVA PICHANGA</p>
          <h1>Convoca jugadores sin volver al grupo de WhatsApp</h1>
          <p className="pageLead">
            Usa una cancha que ya reservaste y deja claros el horario, la cuota y los cupos desde el inicio.
          </p>
        </div>
        <ol aria-label="Pasos de publicación" className="matchStepTabs">
          {([1, 2, 3, 4] as BuilderStep[]).map((step) => {
            const labels = ["Cancha", "Partido", "Cupos", "Publicar"];
            const unlocked = step <= activeStep || canOpenStep(step);
            const completed = step < activeStep && !stepError(step);
            return (
              <li className={`${step === activeStep ? "active" : ""} ${completed ? "completed" : ""}`} key={step}>
                <button
                  aria-current={step === activeStep ? "step" : undefined}
                  disabled={!unlocked}
                  onClick={() => goToStep(step)}
                  type="button"
                >
                  <span>{completed ? "✓" : step}</span>
                  {labels[step - 1]}
                </button>
              </li>
            );
          })}
        </ol>
      </header>

      {loadError && <p className="inlineAlert errorNotice" role="alert">{loadError}</p>}

      {!reservations.length ? (
        <div className="detailPanel empty">
          <CalendarDots size={38} />
          <h2>Primero asegura una cancha</h2>
          <p>Necesitas una reserva confirmada y futura para publicar información real a los jugadores.</p>
          <Link className="primary" href="/?mode=venues">Reservar cancha</Link>
        </div>
      ) : (
        <div className="matchComposerShell">
          <form className="matchBuilderForm" noValidate onSubmit={submit}>
            {activeStep === 1 && <section className="matchFormSection matchStepPanel" aria-labelledby="match-step-1-title">
              <div className="matchFormSectionTitle">
                <span>1</span>
                <div><h2 id="match-step-1-title">Cancha y horario</h2><p>Solo aparecen tus reservas confirmadas y futuras.</p></div>
              </div>
              <label>
                <span><CalendarDots size={18} /> Reserva confirmada</span>
                <select
                  name="reservationId"
                  onChange={(event) => setSelectedReservationId(event.target.value)}
                  required
                  value={selectedReservationId}
                >
                  {reservations.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.spaceName || item.venueName || "Cancha reservada"}
                    </option>
                  ))}
                </select>
              </label>
              {selectedReservation && (
                <div className="selectedCourtSummary">
                  <span><SoccerBall weight="fill" /></span>
                  <div><strong>{selectedReservation.venueName}</strong><small>{selectedReservation.spaceName}</small></div>
                  <div>
                    <strong>{matchStart?.toLocaleTimeString("es-PE", { hour: "numeric", minute: "2-digit" })}</strong>
                    <small>{matchStart?.toLocaleDateString("es-PE", { weekday: "short", day: "numeric", month: "short" })}</small>
                  </div>
                </div>
              )}
            </section>}

            {activeStep === 2 && <section className="matchFormSection matchStepPanel" aria-labelledby="match-step-2-title">
              <div className="matchFormSectionTitle">
                <span>2</span>
                <div><h2 id="match-step-2-title">Datos del partido</h2><p>Un nombre corto ayuda a reconocer la convocatoria.</p></div>
              </div>
              <label>
                <span>Nombre de la pichanga</span>
                <input autoCapitalize="sentences" enterKeyHint="next" inputMode="text" maxLength={120} name="title" onChange={(event) => setTitle(event.target.value)} placeholder="Ej. Pichanga nocturna F7" required type="text" value={title} />
              </label>
              <div className="formPair">
                <label>
                  <span>Nivel</span>
                  <select name="skillLevel" onChange={(event) => setSkillLevel(event.target.value)} value={skillLevel}>
                    <option value="BEGINNER">Principiante</option>
                    <option value="INTERMEDIATE">Intermedio</option>
                    <option value="ADVANCED">Avanzado</option>
                    <option value="ALL_LEVELS">Todos los niveles</option>
                  </select>
                </label>
                <label>
                  <span>Cuota por persona (S/)</span>
                  <input enterKeyHint="next" inputMode="decimal" min="0" name="price" onChange={(event) => setPrice(event.target.value)} required step="0.5" type="number" value={price} />
                </label>
              </div>
            </section>}

            {activeStep === 3 && <section className="matchFormSection matchStepPanel" aria-labelledby="match-step-3-title">
              <div className="matchFormSectionTitle">
                <span>3</span>
                <div><h2 id="match-step-3-title">Cupos y convocatoria</h2><p>Define cuándo el partido está listo y su capacidad máxima.</p></div>
              </div>
              <div className="formPair">
                <label>
                  <span><UsersThree size={18} /> Mínimo para jugar</span>
                  <input enterKeyHint="next" inputMode="numeric" max={selectedCapacity || undefined} min="2" name="minPlayers" onChange={(event) => setMinPlayers(event.target.value)} required type="number" value={minPlayers} />
                </label>
                <label>
                  <span>Cupos máximos</span>
                  <input aria-describedby="max-players-help" enterKeyHint="done" inputMode="numeric" max={selectedCapacity || undefined} min="2" name="maxPlayers" onChange={(event) => setMaxPlayers(event.target.value)} required type="number" value={maxPlayers} />
                  <small id="max-players-help">
                    {selectedCapacity ? `Máximo permitido: ${selectedCapacity} jugadores.` : "No puede superar la capacidad de la cancha."}
                  </small>
                </label>
              </div>
              <label className="policyCheck organizerCountCheck">
                <input checked={organizerCounts} name="organizerCounts" onChange={(event) => setOrganizerCounts(event.target.checked)} type="checkbox" />
                <span><b>Yo también juego</b>Contarme como participante desde la publicación.</span>
              </label>
              <fieldset className="visibilityChoice">
                <legend>¿Quién puede encontrarlo?</legend>
                <div>
                  {visibilityOptions.map(({ value, label, description, Icon }) => (
                    <label className={visibility === value ? "selected" : ""} key={value}>
                      <input checked={visibility === value} name="visibility" onChange={() => setVisibility(value)} type="radio" value={value} />
                      <Icon aria-hidden="true" size={20} />
                      <span><b>{label}</b><small>{description}</small></span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </section>}

            {activeStep === 4 && <section className="matchFormSection matchStepPanel" aria-labelledby="match-step-4-title">
              <div className="matchFormSectionTitle">
                <span>4</span>
                <div><h2 id="match-step-4-title">Revisa y publica</h2><p>Define la regla final antes de abrir la convocatoria.</p></div>
              </div>
              <label>
                <span>Política del evento</span>
                <textarea autoCapitalize="sentences" className="resize-none" inputMode="text" maxLength={500} name="cancellationPolicy" onChange={(event) => setCancellationPolicy(event.target.value)} required value={cancellationPolicy} />
              </label>
            </section>}

            <div className="matchStepActions">
              {activeStep > 1 && (
                <button className="secondary" onClick={() => goToStep((activeStep - 1) as BuilderStep)} type="button">
                  Volver
                </button>
              )}
              {activeStep < 4 ? (
                <button className="primary matchNextButton" onClick={continueToNextStep} type="button">
                  <span>Siguiente</span>
                  <ArrowRight aria-hidden="true" size={20} weight="bold" />
                </button>
              ) : (
                <button aria-busy={busy} className="primary publishMatchButton" disabled={busy} type="submit">
                  <span>{busy ? "Publicando…" : "Publicar partido"}</span>
                  <ArrowRight aria-hidden="true" size={21} weight="bold" />
                </button>
              )}
            </div>
          </form>

          <aside className="matchComposerPreview" aria-label="Vista previa de la pichanga">
            <div className="matchPreviewTopline"><span>VISTA PREVIA</span><b>{visibilityOptions.find((item) => item.value === visibility)?.label}</b></div>
            <div className="matchPreviewIdentity">
              <span><SoccerBall size={28} weight="fill" /></span>
              <div>
                <small>PARTIDO CON CANCHA CONFIRMADA</small>
                <h2>{title || "Tu nueva pichanga"}</h2>
                <p><MapPin weight="fill" /> {selectedReservation?.venueName || "Complejo por elegir"}</p>
              </div>
            </div>
            <div className="matchPreviewFacts">
              <span><CalendarDots /><b>{matchStart?.toLocaleDateString("es-PE", { day: "2-digit", month: "short" }) || "Fecha"}</b><small>{matchStart?.toLocaleTimeString("es-PE", { hour: "numeric", minute: "2-digit" }) || "Hora"}</small></span>
              <span><UsersThree /><b>{numericMaximum || 0}</b><small>cupos</small></span>
              <span><CurrencyCircleDollar /><b>S/ {numericPrice.toFixed(0)}</b><small>por persona</small></span>
            </div>
            <div className="matchPreviewCourt">
              <ShieldCheck size={21} weight="fill" />
              <span><b>{selectedReservation?.spaceName || "Cancha"}</b><small>Reserva confirmada</small></span>
            </div>
            <div className="matchPreviewProgress">
              <span><b>Listos para convocar</b><small>Mínimo {numericMinimum || 0} jugadores</small></span>
              <div><i style={{ width: organizerCounts && numericMaximum ? `${Math.max(8, 100 / numericMaximum)}%` : "0%" }} /></div>
            </div>
            <p><Clock /> Horario y precio visibles antes de que alguien se una.</p>
          </aside>
        </div>
      )}

      <FloatingNotice message={notice} onDismiss={() => setNotice("")} tone="error" />
    </main>
  );
}
