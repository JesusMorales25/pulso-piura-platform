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
  LockKey,
  MapPin,
  ShareNetwork,
  ShieldCheck,
  SoccerBall,
  UsersThree,
} from "@phosphor-icons/react";
import { FloatingNotice } from "@/components/feedback/FloatingNotice";
import { useAuth } from "@/features/auth/AuthProvider";
import type { Reservation, ReservationPage } from "@/features/reservations/types";
import { apiRequest } from "@/lib/api";
import type { MatchSummary } from "./types";

type Visibility = "PUBLIC" | "PRIVATE";
type BuilderStep = 1 | 2 | 3 | 4;

type MatchDraft = {
  activeStep: BuilderStep;
  selectedReservationId: string;
  title: string;
  visibility: Visibility;
  skillLevel: string;
  price: string;
  minPlayers: string;
  maxPlayers: string;
  organizerCounts: boolean;
  cancellationPolicy: string;
};

const visibilityOptions: Array<{
  value: Visibility;
  label: string;
  description: string;
  Icon: typeof Eye;
}> = [
  { value: "PUBLIC", label: "Público", description: "Aparece en Buscar partido", Icon: Eye },
  { value: "PRIVATE", label: "Privado", description: "Solo acceden con el enlace", Icon: LockKey },
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
  const { accessToken, login, user } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [created, setCreated] = useState<MatchSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState<"success" | "error">("error");
  const [titleError, setTitleError] = useState("");
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
  const [draftReady, setDraftReady] = useState(false);
  const draftStorageKey = `pulso:match-draft:${String(user?.profile.sub ?? "current")}`;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = window.sessionStorage.getItem(draftStorageKey);
        if (saved) {
          const draft = JSON.parse(saved) as Partial<MatchDraft>;
          if (draft.selectedReservationId !== undefined) {
            setSelectedReservationId(draft.selectedReservationId);
          }
          if (draft.title !== undefined) setTitle(draft.title);
          if (draft.visibility === "PUBLIC" || draft.visibility === "PRIVATE") setVisibility(draft.visibility);
          if (draft.skillLevel) setSkillLevel(draft.skillLevel);
          if (draft.price !== undefined) setPrice(draft.price);
          if (draft.minPlayers !== undefined) setMinPlayers(draft.minPlayers);
          if (draft.maxPlayers !== undefined) setMaxPlayers(draft.maxPlayers);
          if (draft.organizerCounts !== undefined) setOrganizerCounts(draft.organizerCounts);
          if (draft.cancellationPolicy !== undefined) setCancellationPolicy(draft.cancellationPolicy);
          if ([1, 2, 3, 4].includes(Number(draft.activeStep))) {
            setActiveStep(Number(draft.activeStep) as BuilderStep);
          }
        }
      } catch {
        window.sessionStorage.removeItem(draftStorageKey);
      } finally {
        setDraftReady(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [draftStorageKey]);

  useEffect(() => {
    if (!draftReady || created) return;
    const draft: MatchDraft = {
      activeStep,
      selectedReservationId,
      title,
      visibility,
      skillLevel,
      price,
      minPlayers,
      maxPlayers,
      organizerCounts,
      cancellationPolicy,
    };
    window.sessionStorage.setItem(draftStorageKey, JSON.stringify(draft));
  }, [activeStep, cancellationPolicy, created, draftReady, draftStorageKey, maxPlayers, minPlayers, organizerCounts, price, selectedReservationId, skillLevel, title, visibility]);

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
        setSelectedReservationId((current) =>
          available.some((item) => item.id === current) ? current : "",
        );
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
  const numericPrice = Number(price.replace(",", ".")) || 0;
  const numericMaximum = Number(maxPlayers) || 0;
  const numericMinimum = Number(minPlayers) || 0;
  const compatibleReservations = useMemo(
    () => reservations.filter((item) => !item.spaceCapacity || item.spaceCapacity >= numericMaximum),
    [numericMaximum, reservations],
  );

  function stepError(step: BuilderStep) {
    if (step === 1) {
      if (title.trim().length < 3) return "Escribe un nombre de al menos 3 caracteres.";
      if (!Number.isFinite(Number(price.replace(",", "."))) || numericPrice < 0) {
        return "Ingresa una cuota válida para el partido.";
      }
    }
    if (step === 2) {
      if (numericMinimum < 2) return "El mínimo debe ser de al menos 2 jugadores.";
      if (numericMaximum < numericMinimum) {
        return "Los cupos máximos deben ser iguales o mayores al mínimo de jugadores.";
      }
    }
    if (step === 3 && cancellationPolicy.trim().length < 10) {
      return "Describe brevemente la política de cancelación.";
    }
    if (step === 4) {
      if (!selectedReservationId) return "Selecciona una cancha confirmada para publicar.";
      if (selectedCapacity && numericMaximum > selectedCapacity) {
        return `Esta cancha admite como máximo ${selectedCapacity} jugadores.`;
      }
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
      setNoticeTone("error");
      setNotice("");
      setActiveStep(target);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const firstIncomplete = ([1, 2, 3, 4] as BuilderStep[]).find(
      (step) => step < target && stepError(step),
    );
    setNoticeTone("error");
    setNotice(stepError(firstIncomplete || activeStep));
  }

  function continueToNextStep() {
    const error = stepError(activeStep);
    if (error) {
      setNoticeTone("error");
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
    const firstInvalidStep = ([1, 2, 3, 4] as BuilderStep[]).find((step) => stepError(step));
    if (firstInvalidStep) {
      setNoticeTone("error");
      setNotice(stepError(firstInvalidStep));
      setActiveStep(firstInvalidStep);
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
      window.sessionStorage.removeItem(draftStorageKey);
      setCreated(published);
    } catch (reason) {
      const message = friendlyPublishError(reason);
      setNoticeTone("error");
      setNotice(message);
      if (message.toLocaleLowerCase("es-PE").includes("nombre")) {
        setTitleError(message);
        setActiveStep(1);
      }
    } finally {
      setBusy(false);
    }
  }

  async function copyCreatedLink() {
    if (!created) return;
    const url = `${window.location.origin}/partidos/${created.publicSlug}`;
    try {
      await navigator.clipboard.writeText(url);
      setNoticeTone("success");
      setNotice("Enlace del partido copiado. Ya puedes compartirlo con los jugadores.");
    } catch {
      setNoticeTone("error");
      setNotice("No pudimos copiar el enlace. Ábrelo y compártelo desde el navegador.");
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
              : "no aparece en Explorar; comparte su enlace con quienes quieras invitar."}
          </p>
          <div className="buttonRow">
            <Link className="primary" href={`/partidos/${created.publicSlug}`}>Ver publicación</Link>
            <button className="secondary" onClick={() => void copyCreatedLink()} type="button">
              <ShareNetwork aria-hidden="true" size={19} /> Compartir enlace
            </button>
            <Link className="secondary" href="/organizador">Administrar jugadores</Link>
          </div>
        </div>
        <FloatingNotice message={notice} onDismiss={() => setNotice("")} tone={noticeTone} />
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
            Define primero el partido y sus cupos. Al final elige una cancha compatible y publícalo.
          </p>
        </div>
        <ol aria-label="Pasos de publicación" className="matchStepTabs">
          {([1, 2, 3, 4] as BuilderStep[]).map((step) => {
            const labels = ["Partido", "Cupos", "Publicar", "Cancha"];
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

      <div className="matchComposerShell">
          <form className="matchBuilderForm" noValidate onSubmit={submit}>
            {activeStep === 1 && <section className="matchFormSection matchStepPanel" aria-labelledby="match-step-1-title">
              <div className="matchFormSectionTitle">
                <span>1</span>
                <div><h2 id="match-step-1-title">Datos del partido</h2><p>Describe la pichanga antes de elegir dónde jugar.</p></div>
              </div>
              <label>
                <span>Nombre de la pichanga</span>
                <input
                  aria-describedby={titleError ? "match-title-error" : undefined}
                  aria-invalid={titleError ? "true" : undefined}
                  autoCapitalize="sentences"
                  enterKeyHint="next"
                  inputMode="text"
                  maxLength={120}
                  name="title"
                  onChange={(event) => {
                    setTitle(event.target.value);
                    setTitleError("");
                  }}
                  placeholder="Ej. Pichanga nocturna F7"
                  required
                  type="text"
                  value={title}
                />
                {titleError && <small className="matchFieldError" id="match-title-error" role="alert">{titleError}</small>}
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
                  <input enterKeyHint="next" inputMode="decimal" min="0" name="price" onChange={(event) => setPrice(event.target.value)} required step="0.01" type="number" value={price} />
                </label>
              </div>
            </section>}

            {activeStep === 2 && <section className="matchFormSection matchStepPanel" aria-labelledby="match-step-2-title">
              <div className="matchFormSectionTitle">
                <span>2</span>
                <div><h2 id="match-step-2-title">Cupos y convocatoria</h2><p>Define cuándo el partido está listo y cuántos podrán inscribirse.</p></div>
              </div>
              <div className="formPair">
                <label>
                  <span><UsersThree size={18} /> Mínimo para jugar</span>
                  <input enterKeyHint="next" inputMode="numeric" min="2" name="minPlayers" onChange={(event) => setMinPlayers(event.target.value)} required type="number" value={minPlayers} />
                </label>
                <label>
                  <span>Cupos máximos</span>
                  <input
                    aria-describedby="max-players-help"
                    enterKeyHint="done"
                    inputMode="numeric"
                    min="2"
                    name="maxPlayers"
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setMaxPlayers(nextValue);
                      if (selectedCapacity && Number(nextValue) > selectedCapacity) {
                        setSelectedReservationId("");
                      }
                    }}
                    required
                    type="number"
                    value={maxPlayers}
                  />
                  <small id="max-players-help">Lo validaremos contra la capacidad al elegir la cancha.</small>
                </label>
              </div>
              <label className="policyCheck organizerCountCheck">
                <input checked={organizerCounts} name="organizerCounts" onChange={(event) => setOrganizerCounts(event.target.checked)} type="checkbox" />
                <span><b>Yo también juego</b>Contarme como participante desde la publicación.</span>
              </label>
            </section>}

            {activeStep === 3 && <section className="matchFormSection matchStepPanel" aria-labelledby="match-step-3-title">
              <div className="matchFormSectionTitle">
                <span>3</span>
                <div><h2 id="match-step-3-title">Publicación</h2><p>Elige quién podrá encontrar el partido y deja claras sus reglas.</p></div>
              </div>
              <fieldset className="visibilityChoice visibilityChoiceTwo">
                <legend>Visibilidad del partido</legend>
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
              <div className="matchShareHint">
                <ShareNetwork aria-hidden="true" size={21} />
                <p><b>Siempre tendrás un enlace para compartir.</b><span>Los jugadores podrán abrirlo e inscribirse; los partidos privados no aparecerán en Explorar.</span></p>
              </div>
              <label>
                <span>Política del evento</span>
                <textarea autoCapitalize="sentences" className="resize-none" inputMode="text" maxLength={500} name="cancellationPolicy" onChange={(event) => setCancellationPolicy(event.target.value)} required value={cancellationPolicy} />
              </label>
            </section>}

            {activeStep === 4 && <section className="matchFormSection matchStepPanel" aria-labelledby="match-step-4-title">
              <div className="matchFormSectionTitle">
                <span>4</span>
                <div><h2 id="match-step-4-title">Cancha y horario</h2><p>Selecciona al final una reserva que admita todos los cupos.</p></div>
              </div>
              {!compatibleReservations.length ? (
                <div className="matchCourtEmpty">
                  <CalendarDots aria-hidden="true" size={34} />
                  <div>
                    <h3>No tienes una cancha compatible</h3>
                    <p>Reserva una cancha futura con capacidad para {numericMaximum || "los"} jugadores y vuelve a este paso.</p>
                  </div>
                  <Link className="secondary" href="/?mode=venues&from=create">Reservar cancha</Link>
                </div>
              ) : (
                <>
                  <label>
                    <span><CalendarDots size={18} /> Reserva confirmada</span>
                    <select name="reservationId" onChange={(event) => setSelectedReservationId(event.target.value)} required value={selectedReservationId}>
                      <option value="">Selecciona una cancha</option>
                      {compatibleReservations.map((item) => (
                        <option key={item.id} value={item.id}>{item.spaceName || item.venueName || "Cancha reservada"}</option>
                      ))}
                    </select>
                  </label>
                  {selectedReservation && (
                    <div className="selectedCourtSummary">
                      <span><SoccerBall weight="fill" /></span>
                      <div><strong>{selectedReservation.venueName}</strong><small>{selectedReservation.spaceName} · capacidad {selectedCapacity || "por confirmar"}</small></div>
                      <div>
                        <strong>{matchStart?.toLocaleTimeString("es-PE", { hour: "numeric", minute: "2-digit" })}</strong>
                        <small>{matchStart?.toLocaleDateString("es-PE", { weekday: "short", day: "numeric", month: "short" })}</small>
                      </div>
                    </div>
                  )}
                </>
              )}
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
              <span><CurrencyCircleDollar /><b>{new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", maximumFractionDigits: numericPrice % 1 ? 2 : 0 }).format(numericPrice)}</b><small>por persona</small></span>
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

      <FloatingNotice message={notice} onDismiss={() => setNotice("")} tone={noticeTone} />
    </main>
  );
}
