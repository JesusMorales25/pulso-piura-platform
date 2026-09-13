"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { apiRequest } from "@/lib/api";

type Role = "OWNER" | "ADMIN" | "OPERATOR";
type SpaceSummary = { id: string; name: string };
type AvailabilityRule = {
  id: string;
  dayOfWeek: number;
  startLocalTime: string;
  endLocalTime: string;
  slotMinutes: number;
  priceMinor: number;
  currency: "PEN";
  validFrom: string;
  validTo: string | null;
  status: "ACTIVE" | "INACTIVE";
  version: number;
};
type AvailabilityException = {
  id: string;
  startsAt: string;
  endsAt: string;
  type: "CLOSED" | "MAINTENANCE" | "SPECIAL_PRICE";
  priceMinor: number | null;
  reason: string | null;
  status: "ACTIVE" | "CANCELLED";
  version: number;
};

const days = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

export function AvailabilityAdmin({
  organizationId,
  space,
  role,
}: {
  organizationId: string;
  space: SpaceSummary;
  role: Role;
}) {
  const { accessToken } = useAuth();
  const canManage = role === "OWNER" || role === "ADMIN";
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [panel, setPanel] = useState<"schedule" | "exceptions">("schedule");
  const [pendingAction, setPendingAction] = useState<
    | { kind: "rule"; item: AvailabilityRule }
    | { kind: "exception"; item: AvailabilityException }
    | null
  >(null);

  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    const base = `/organizations/${organizationId}/spaces/${space.id}`;
    Promise.all([
      apiRequest<AvailabilityRule[]>(`${base}/availability-rules`, accessToken),
      apiRequest<AvailabilityException[]>(`${base}/exceptions`, accessToken),
    ])
      .then(([ruleResult, exceptionResult]) => {
        if (!active) return;
        setRules(ruleResult);
        setExceptions(exceptionResult);
      })
      .catch((requestError: unknown) => {
        if (active) setError(errorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [accessToken, organizationId, space.id]);

  async function createRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await runMutation(async () => {
      const rule = await apiRequest<AvailabilityRule>(
        `/organizations/${organizationId}/spaces/${space.id}/availability-rules`,
        accessToken,
        {
          method: "POST",
          body: JSON.stringify({
            dayOfWeek: Number(form.get("dayOfWeek")),
            startLocalTime: form.get("startLocalTime"),
            endLocalTime: form.get("endLocalTime"),
            slotMinutes: Number(form.get("slotMinutes")),
            priceMinor: solesToMinor(form.get("price")),
            validFrom: form.get("validFrom"),
            validTo: nullableText(form.get("validTo")),
          }),
        },
      );
      setRules((current) => [...current, rule]);
      formElement.reset();
      return "Horario semanal agregado.";
    });
  }

  async function deactivateRule(rule: AvailabilityRule) {
    if (!accessToken) return;
    await runMutation(async () => {
      await apiRequest<void>(
        `/organizations/${organizationId}/spaces/${space.id}/availability-rules/${rule.id}?version=${rule.version}`,
        accessToken,
        { method: "DELETE" },
      );
      setRules((current) =>
        current.map((item) =>
          item.id === rule.id ? { ...item, status: "INACTIVE" } : item,
        ),
      );
      return "Horario desactivado.";
    });
  }

  async function createException(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const type = String(form.get("type"));
    await runMutation(async () => {
      const exception = await apiRequest<AvailabilityException>(
        `/organizations/${organizationId}/spaces/${space.id}/exceptions`,
        accessToken,
        {
          method: "POST",
          body: JSON.stringify({
            startsAt: localDateTimeToInstant(form.get("startsAt")),
            endsAt: localDateTimeToInstant(form.get("endsAt")),
            type,
            priceMinor:
              type === "SPECIAL_PRICE" ? solesToMinor(form.get("price")) : null,
            reason: nullableText(form.get("reason")),
          }),
        },
      );
      setExceptions((current) => [...current, exception]);
      formElement.reset();
      return "Excepción operativa agregada.";
    });
  }

  async function cancelException(exception: AvailabilityException) {
    if (!accessToken) return;
    await runMutation(async () => {
      await apiRequest<void>(
        `/organizations/${organizationId}/spaces/${space.id}/exceptions/${exception.id}?version=${exception.version}`,
        accessToken,
        { method: "DELETE" },
      );
      setExceptions((current) =>
        current.map((item) =>
          item.id === exception.id ? { ...item, status: "CANCELLED" } : item,
        ),
      );
      return "Excepción cancelada.";
    });
  }

  async function runMutation(operation: () => Promise<string>) {
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      setMessage(await operation());
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmPendingAction() {
    if (!pendingAction) return;
    const action = pendingAction;
    setPendingAction(null);
    if (action.kind === "rule") await deactivateRule(action.item);
    else await cancelException(action.item);
  }

  if (loading)
    return (
      <div className="notice">Cargando disponibilidad de {space.name}…</div>
    );

  return (
    <section className="availabilityAdmin" aria-labelledby="availability-title">
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">DISPONIBILIDAD</p>
          <h3 id="availability-title">Horarios de {space.name}</h3>
        </div>
      </div>
      <p className="muted">
        Los horarios semanales usan la hora de Piura. Los cierres puntuales se
        almacenan de forma segura en UTC.
      </p>
      {error && (
        <div className="inlineAlert errorNotice" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="inlineAlert successNotice" role="status">
          {message}
        </div>
      )}
      <nav
        className="setupStepper availabilityStepper"
        aria-label="Configuración de disponibilidad"
      >
        <button
          aria-current={panel === "schedule" ? "step" : undefined}
          className={panel === "schedule" ? "active" : ""}
          onClick={() => setPanel("schedule")}
          type="button"
        >
          <span>1</span> Días, horas y precio
        </button>
        <button
          aria-current={panel === "exceptions" ? "step" : undefined}
          className={panel === "exceptions" ? "active" : ""}
          onClick={() => setPanel("exceptions")}
          type="button"
        >
          <span>2</span> Cierres puntuales
        </button>
      </nav>
      {pendingAction && (
        <aside
          className="inlineConfirm"
          aria-labelledby="availability-confirm-title"
          role="region"
        >
          <div>
            <strong id="availability-confirm-title">
              {pendingAction.kind === "rule"
                ? "¿Desactivar este horario?"
                : "¿Cancelar esta excepción?"}
            </strong>
            <p>
              Los cambios aplican a las próximas reservas y se registran en el
              historial.
            </p>
          </div>
          <div>
            <button
              className="secondary"
              onClick={() => setPendingAction(null)}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="dangerButton"
              disabled={submitting}
              onClick={() => void confirmPendingAction()}
              type="button"
            >
              Confirmar
            </button>
          </div>
        </aside>
      )}
      <div className="availabilityGrid">
        {panel === "schedule" && (
          <div className="venueColumn setupPanel">
            <h4>Horario semanal</h4>
            <div className="scheduleList">
              {rules.length === 0 ? (
                <p className="muted">Sin horarios configurados.</p>
              ) : (
                rules.map((rule) => (
                  <article className="scheduleCard" key={rule.id}>
                    <div>
                      <strong>
                        {days[rule.dayOfWeek - 1]},{" "}
                        {shortTime(rule.startLocalTime)}–
                        {shortTime(rule.endLocalTime)}
                      </strong>
                      <small>
                        S/ {minorToSoles(rule.priceMinor)} · slots de{" "}
                        {rule.slotMinutes} min
                      </small>
                    </div>
                    <span className="pill">{rule.status}</span>
                    {canManage && rule.status === "ACTIVE" && (
                      <button
                        className="dangerButton"
                        disabled={submitting}
                        onClick={() =>
                          setPendingAction({ kind: "rule", item: rule })
                        }
                      >
                        Desactivar
                      </button>
                    )}
                  </article>
                ))
              )}
            </div>
            {canManage && (
              <RuleForm disabled={submitting} onSubmit={createRule} />
            )}
          </div>
        )}
        {panel === "exceptions" && (
          <div className="venueColumn setupPanel">
            <h4>Cierres y excepciones</h4>
            <div className="scheduleList">
              {exceptions.length === 0 ? (
                <p className="muted">Sin excepciones registradas.</p>
              ) : (
                exceptions.map((item) => (
                  <article className="scheduleCard" key={item.id}>
                    <div>
                      <strong>{exceptionLabel(item.type)}</strong>
                      <small>
                        {formatInstant(item.startsAt)} –{" "}
                        {formatInstant(item.endsAt)}
                        {item.priceMinor !== null
                          ? ` · S/ ${minorToSoles(item.priceMinor)}`
                          : ""}
                      </small>
                    </div>
                    <span className="pill">{item.status}</span>
                    {item.status === "ACTIVE" &&
                      (canManage || item.type !== "SPECIAL_PRICE") && (
                        <button
                          className="dangerButton"
                          disabled={submitting}
                          onClick={() =>
                            setPendingAction({ kind: "exception", item })
                          }
                        >
                          Cancelar
                        </button>
                      )}
                  </article>
                ))
              )}
            </div>
            <ExceptionForm
              canManage={canManage}
              disabled={submitting}
              onSubmit={createException}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function RuleForm({
  disabled,
  onSubmit,
}: {
  disabled: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="card adminForm compactForm" noValidate onSubmit={onSubmit}>
      <h4>Agregar horario</h4>
      <label>
        Día
        <select name="dayOfWeek" defaultValue="1">
          {days.map((day, index) => (
            <option key={day} value={index + 1}>
              {day}
            </option>
          ))}
        </select>
      </label>
      <div className="formPair">
        <label>
          Desde
          <input name="startLocalTime" type="time" required />
        </label>
        <label>
          Hasta
          <input name="endLocalTime" type="time" required />
        </label>
      </div>
      <div className="formPair">
        <label>
          Duración
          <select name="slotMinutes" defaultValue="60">
            <option value="30">30 min</option>
            <option value="60">60 min</option>
            <option value="90">90 min</option>
            <option value="120">120 min</option>
          </select>
        </label>
        <label>
          Precio (S/)
          <input name="price" type="number" min="0" step="0.01" required />
        </label>
      </div>
      <div className="formPair">
        <label>
          Vigente desde
          <input name="validFrom" type="date" required />
        </label>
        <label>
          Hasta (opcional)
          <input name="validTo" type="date" />
        </label>
      </div>
      <button className="primary borderless" disabled={disabled}>
        Agregar horario
      </button>
    </form>
  );
}

function ExceptionForm({
  canManage,
  disabled,
  onSubmit,
}: {
  canManage: boolean;
  disabled: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [type, setType] = useState("CLOSED");
  return (
    <form className="card adminForm compactForm" noValidate onSubmit={onSubmit}>
      <h4>Nueva excepción</h4>
      <label>
        Tipo
        <select
          name="type"
          value={type}
          onChange={(event) => setType(event.target.value)}
        >
          <option value="CLOSED">Cierre</option>
          <option value="MAINTENANCE">Mantenimiento</option>
          {canManage && <option value="SPECIAL_PRICE">Precio especial</option>}
        </select>
      </label>
      <label>
        Inicio
        <input name="startsAt" type="datetime-local" required />
      </label>
      <label>
        Fin
        <input name="endsAt" type="datetime-local" required />
      </label>
      {canManage && type === "SPECIAL_PRICE" && (
        <label>
          Precio especial (S/)
          <input name="price" type="number" min="0" step="0.01" required />
        </label>
      )}
      <label>
        Motivo
        <input name="reason" maxLength={240} />
      </label>
      <button className="primary borderless" disabled={disabled}>
        Agregar excepción
      </button>
    </form>
  );
}

function solesToMinor(value: FormDataEntryValue | null) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Ingresa un precio válido.");
  }
  return Math.round(amount * 100);
}
function minorToSoles(value: number) {
  return (value / 100).toFixed(2);
}
function nullableText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}
function localDateTimeToInstant(value: FormDataEntryValue | null) {
  return new Date(String(value)).toISOString();
}
function shortTime(value: string) {
  return value.slice(0, 5);
}
function formatInstant(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
function exceptionLabel(type: AvailabilityException["type"]) {
  return type === "CLOSED"
    ? "Cierre"
    : type === "MAINTENANCE"
      ? "Mantenimiento"
      : "Precio especial";
}
function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "No se pudo completar la operación.";
}
