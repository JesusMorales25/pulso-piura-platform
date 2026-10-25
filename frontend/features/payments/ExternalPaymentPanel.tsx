"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import { ApiError, apiRequest } from "@/lib/api";
import styles from "./ExternalPaymentPanel.module.css";
import Image from "next/image";
import Link from "next/link";
import { ReservationHistory } from "@/features/reservations/ReservationHistory";
import {
  CheckCircle,
  ClockCounterClockwise,
  FileText,
  ArrowSquareOut,
  CreditCard,
} from "@phosphor-icons/react";
import { FormSheet } from "@/components/forms/FormSheet";
import { proofImageError, paymentPreparationActive } from "./proof-validation";

type Destination = {
  version: string;
  holderName: string;
  phone: string;
  yapeEnabled: boolean;
  plinEnabled: boolean;
  configured: boolean;
};
type PreparedPayment = {
  amountMinor: number;
  currency: string;
  expiresAt: string;
  destination: Destination;
  method: string;
  plan: string;
};
export type ExternalProof = {
  id: string;
  targetType: "MATCH" | "RESERVATION";
  targetId: string;
  payerUserId: string;
  payerName: string;
  amountMinor: number;
  currency: string;
  method: string;
  plan: string;
  status:
    | "PENDING_REVIEW"
    | "CONFIRMED"
    | "REJECTED"
    | "CORRECTION_REQUIRED"
    | "NEEDS_RESOLUTION";
  reference: string | null;
  createdAt: string;
  reviewExpiresAt: string;
  reviewNote: string | null;
  reviewedAt: string | null;
  holderName: string;
  phone: string;
  canReview: boolean;
  hasImage: boolean;
  ownPayment?: boolean;
};
const labels: Record<ExternalProof["status"], string> = {
  PENDING_REVIEW: "Enviado, pendiente de validación",
  CONFIRMED: "Pago confirmado",
  REJECTED: "Comprobante rechazado",
  CORRECTION_REQUIRED: "Necesita corrección",
  NEEDS_RESOLUTION:
    "Requiere resolución: el horario o cupo ya no está disponible",
};
export function useExternalPayments() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void apiRequest<{ enabled: boolean }>(
      "/external-payments/capabilities",
      null,
      { signal: controller.signal },
    )
      .then((value) => {
        if (!controller.signal.aborted) setEnabled(value.enabled);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  return enabled;
}

export function ExternalPaymentPanel(
  props: ComponentProps<typeof ExternalPaymentPanelInner>,
) {
  return (
    <ExternalPaymentPanelInner
      key={`${props.targetType}:${props.targetId}:${Boolean(props.organizationSettings)}`}
      {...props}
    />
  );
}

function ExternalPaymentPanelInner({
  accessToken,
  targetType,
  targetId,
  reviewer = false,
  allowUpload = true,
  organizationSettings = false,
  plans = [{ plan: "FULL", label: "Pago completo" }],
  onChange,
  reservationAmounts,
}: {
  accessToken: string;
  targetType: "MATCH" | "RESERVATION";
  targetId: string;
  reviewer?: boolean;
  allowUpload?: boolean;
  organizationSettings?: boolean;
  plans?: { plan: "FULL" | "DEPOSIT" | "BALANCE"; label: string }[];
  onChange?: () => void;
  reservationAmounts?: ReactNode;
}) {
  const enabled = useExternalPayments();
  const [destination, setDestination] = useState<Destination | null>(null);
  const [proofs, setProofs] = useState<ExternalProof[]>([]);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [paymentsLoaded, setPaymentsLoaded] = useState(false);
  const recoveryLoaded = useRef(false);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [editingDestination, setEditingDestination] = useState(false);
  const [destinationSaved, setDestinationSaved] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [prepared, setPrepared] = useState<PreparedPayment | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const preparationKey = useRef(crypto.randomUUID());
  const key = useRef(crypto.randomUUID());
  const lock = useRef(false);
  const previousProofState = useRef<string | null>(null);
  const changeCallback = useRef(onChange);
  useEffect(() => {
    changeCallback.current = onChange;
  }, [onChange]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const viewProof = (proof: ExternalProof) =>
    void mutate(async () => {
      const blob = await apiRequest<Blob>(
        `/external-payments/${proof.id}/image`,
        accessToken,
        { cache: "no-store", redirect: "error" },
      );
      if (blob.type !== "image/png")
        throw new Error("El comprobante no tiene un formato válido.");
      setImage(URL.createObjectURL(blob));
    });
  const query = `targetType=${targetType}&targetId=${encodeURIComponent(targetId)}`;
  const destinationPath = organizationSettings
    ? `/organizations/${encodeURIComponent(targetId)}/external-payment-destination`
    : "/external-payments/destination";
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    async function load() {
      try {
        const [recipientResult, proofResult, preparationResult] =
          await Promise.allSettled([
            apiRequest<Destination>(
              organizationSettings
                ? destinationPath
                : destinationPath + "?" + query,
              accessToken,
              { signal: controller.signal },
            ),
            organizationSettings
              ? Promise.resolve([] as ExternalProof[])
              : apiRequest<ExternalProof[]>(
                  "/external-payments?" + query,
                  accessToken,
                  { signal: controller.signal },
                ),
            allowUpload && !recoveryLoaded.current
              ? apiRequest<{
                  preparation: Omit<PreparedPayment, "method" | "plan">;
                  method: string;
                  plan: string;
                } | null>(
                  "/external-payments/preparation?" + query,
                  accessToken,
                  { signal: controller.signal },
                )
              : Promise.resolve(null),
          ]);
        if (!controller.signal.aborted) {
          if (proofResult.status === "rejected") throw proofResult.reason;
          const items = proofResult.value;
          const blocked = items.some(
            (item) =>
              (item.ownPayment ?? !item.canReview) &&
              ["PENDING_REVIEW", "NEEDS_RESOLUTION"].includes(item.status),
          );
          setProofs(items);
          if (recipientResult.status === "fulfilled") {
            setDestination((current) =>
              current?.configured ? current : recipientResult.value,
            );
          } else if (!blocked && items.length === 0)
            throw recipientResult.reason;
          if (blocked && allowUpload) {
            setPrepared(null);
            setPaymentOpen(false);
            recoveryLoaded.current = true;
          } else if (!recoveryLoaded.current && allowUpload) {
            if (preparationResult.status === "rejected")
              throw preparationResult.reason;
            const saved = preparationResult.value;
            if (saved?.preparation)
              setPrepared({
                ...saved.preparation,
                method: saved.method,
                plan: saved.plan,
              });
            recoveryLoaded.current = true;
          }
          setPaymentsLoaded(true);
          setLoadError("");
          const state = items
            .map((item) => `${item.id}:${item.status}`)
            .join(",");
          if (
            previousProofState.current !== null &&
            previousProofState.current !== state
          )
            changeCallback.current?.();
          previousProofState.current = state;
        }
      } catch (reason) {
        if (!controller.signal.aborted)
          setLoadError(
            reason instanceof Error
              ? reason.message
              : "No se pudieron consultar los pagos.",
          );
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 8000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [
    accessToken,
    enabled,
    query,
    refresh,
    destinationPath,
    organizationSettings,
    allowUpload,
  ]);
  useEffect(
    () => () => {
      if (image) URL.revokeObjectURL(image);
    },
    [image],
  );
  async function mutate(action: () => Promise<unknown>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
      setRefresh((value) => value + 1);
      onChange?.();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No se pudo completar la operación.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    data.set("targetType", targetType);
    data.set("targetId", targetId);
    if (
      !prepared ||
      !paymentPreparationActive(prepared.expiresAt, Date.now())
    ) {
      setError(
        "La preparación del pago venció. Si ya transferiste, no vuelvas a pagar; contacta al responsable para resolverlo. Conserva la captura y el número de operación.",
      );
      return;
    }
    data.set("destinationVersion", prepared.destination.version);
    data.set("method", prepared.method);
    data.set("plan", prepared.plan);
    const file = data.get("file");
    const imageError = proofImageError(file instanceof File ? file : null);
    if (imageError) {
      setError(imageError);
      return;
    }
    await mutate(async () => {
      try {
        const sent = await apiRequest<ExternalProof>(
          "/external-payments",
          accessToken,
          {
            method: "POST",
            headers: { "Idempotency-Key": key.current },
            body: data,
            redirect: "error",
          },
        );
        setProofs((current) => [
          ...current.filter((item) => item.id !== sent.id),
          sent,
        ]);
      } catch (reason) {
        if (reason instanceof ApiError && reason.status === 409) {
          setRefresh((value) => value + 1);
          throw new Error(
            reason.message +
              " No vuelvas a transferir; revisa el estado o contacta al receptor.",
          );
        }
        throw reason;
      }
      key.current = crypto.randomUUID();
      form.reset();
      setPaymentOpen(false);
      setPrepared(null);
    });
  }
  if (!enabled) return reservationAmounts ?? null;
  const latestProof = [...proofs].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  )[0];
  const pending = proofs.some(
    (proof) =>
      (proof.ownPayment ?? !proof.canReview) &&
      ["PENDING_REVIEW", "NEEDS_RESOLUTION"].includes(proof.status),
  );
  const preparedActive =
    allowUpload &&
    !!prepared &&
    paymentPreparationActive(prepared.expiresAt, now);
  const externalTotal = (status: ExternalProof["status"]) =>
    new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(
      proofs
        .filter((proof) => proof.status === status)
        .reduce((sum, proof) => sum + proof.amountMinor, 0) / 100,
    );
  const matchPayment = targetType === "MATCH";
  const recipientLabel = matchPayment ? "organizador" : "propietario";
  const canEditDestination =
    reviewer && (organizationSettings || targetType === "MATCH");
  const shownDestination = allowUpload
    ? preparedActive
      ? prepared.destination
      : null
    : reviewer && (organizationSettings || targetType === "MATCH")
      ? destination
      : null;
  const paymentControls = (
    <>
      {shownDestination?.configured && (
        <p className={styles.destinationSummary}>
          <strong>{shownDestination.holderName}</strong>
          <br />
          Celular: {shownDestination.phone}
          <br />
          {[
            shownDestination.yapeEnabled && "Yape",
            shownDestination.plinEnabled && "Plin",
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
      {!destination?.configured && (organizationSettings || !reviewer) && (
        <p role="status">
          El {recipientLabel} todavía debe configurar su cuenta receptora. No
          realices la transferencia hasta verla aquí.
        </p>
      )}
      {allowUpload && destination?.configured && !pending && (
        <form
          onChange={() => {
            preparationKey.current = crypto.randomUUID();
          }}
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const method = String(data.get("method"));
            const plan = String(data.get("plan"));
            void mutate(async () => {
              const result = await apiRequest<
                Omit<PreparedPayment, "method" | "plan">
              >("/external-payments/prepare", accessToken, {
                method: "POST",
                headers: { "Idempotency-Key": preparationKey.current },
                body: JSON.stringify({ targetType, targetId, method, plan }),
              });
              setPrepared({ ...result, method, plan });
              key.current = crypto.randomUUID();
              preparationKey.current = crypto.randomUUID();
            });
          }}
        >
          <p>
            Prepara el pago para verificar y retener el horario o cupo antes de
            transferir. Si ya transferiste, conserva los datos y contacta al
            responsable; no realices otro pago.
          </p>
          <label>
            Método
            <select name="method" defaultValue={prepared?.method}>
              {destination.yapeEnabled && <option value="YAPE">Yape</option>}
              {destination.plinEnabled && <option value="PLIN">Plin</option>}
            </select>
          </label>
          <label>
            Importe a pagar
            <select name="plan" defaultValue={prepared?.plan}>
              {plans.map((item) => (
                <option key={item.plan} value={item.plan}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <button className="primary" type="submit" disabled={busy}>
            {busy
              ? "Verificando disponibilidad…"
              : prepared
                ? "Actualizar preparación"
                : "Verificar disponibilidad"}
          </button>
        </form>
      )}
      {prepared && !pending && (
        <form
          onSubmit={(event) => void upload(event)}
          onChange={() => {
            key.current = crypto.randomUUID();
          }}
        >
          {preparedActive ? (
            <div role="status" className={styles.preparationNotice}>
              <p>Importe verificado</p>
              <strong className={styles.preparationAmount}>
                {new Intl.NumberFormat("es-PE", {
                  style: "currency",
                  currency: prepared.currency,
                }).format(prepared.amountMinor / 100)}
              </strong>
              <p>
                {prepared.method === "YAPE" ? "Yape" : "Plin"} · Retenido hasta{" "}
                {new Date(prepared.expiresAt).toLocaleTimeString("es-PE", {
                  timeZone: "America/Lima",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </p>
              <p>Envía el comprobante antes de esa hora.</p>
            </div>
          ) : (
            <p role="alert">
              La preparación venció. No transfieras. Si ya pagaste, no vuelvas a
              transferir; contacta al responsable y conserva esta captura y
              referencia para resolverlo.
            </p>
          )}
          <label>
            Número de operación (opcional)
            <input name="reference" maxLength={100} />
          </label>
          <label>
            Captura del comprobante JPG o PNG (máximo 5 MB)
            <input
              name="file"
              type="file"
              accept="image/png,image/jpeg"
              required
            />
          </label>
          <label className={styles.methodChoice}>
            <input type="checkbox" required />
            Acepto las{" "}
            <Link
              href="/informacion/cancelaciones"
              target="_blank"
              rel="noreferrer"
            >
              condiciones de pagos y cancelaciones
            </Link>{" "}
            y entiendo que el pago requiere validación manual.
          </label>
          <button
            className="primary"
            type="submit"
            disabled={busy || !preparedActive}
          >
            {busy ? "Enviando…" : "Enviar para validación"}
          </button>
        </form>
      )}
    </>
  );
  return (
    <section
      className={`${styles.panel} ${organizationSettings ? styles.accountPanel : targetType === "RESERVATION" ? styles.reservationPanel : ""} card`}
      aria-label={
        reviewer ? "Revisión de pagos externos" : "Pago por Yape o Plin"
      }
    >
      <h3>
        {!organizationSettings && targetType === "RESERVATION" && (
          <CreditCard aria-hidden="true" size={22} />
        )}
        {organizationSettings
          ? "Cuenta receptora del complejo"
          : reviewer
            ? matchPayment
              ? "Cobros del partido"
              : "Verificación de pago"
            : allowUpload
              ? "Paga con Yape o Plin"
              : "Verificación de pago"}
      </h3>
      {!organizationSettings && (
        <p>
          {organizationSettings
            ? "Configura los datos que verán los jugadores antes de su primera reserva. Verifica el titular y celular antes de guardarlos."
            : !allowUpload
              ? matchPayment
                ? "El organizador valida los comprobantes de este partido."
                : "Revisa los comprobantes y su estado."
              : matchPayment
                ? "Paga tu cuota al organizador por Yape o Plin y envía el comprobante. Tu cupo se confirma cuando él apruebe el pago."
                : "Primero prepara el pago para verificar disponibilidad; después transfiere desde tu aplicación. Enviar una captura no confirma el pago: el responsable debe verificarlo."}
        </p>
      )}
      {loadError && (
        <div className="notice" role="alert">
          <p>{loadError}</p>
          <button
            className="secondary"
            type="button"
            onClick={() => setRefresh((value) => value + 1)}
          >
            Reintentar consulta de pagos
          </button>
        </div>
      )}
      {destinationSaved && (
        <p className={styles.saved} role="status">
          Cuenta receptora actualizada.
        </p>
      )}
      {error && !paymentOpen && (
        <p role="alert" className="errorNotice">
          {error}
        </p>
      )}
      {!organizationSettings &&
        targetType !== "RESERVATION" &&
        proofs.length > 0 && (
          <dl className="reservationSummary">
            <div>
              <dt>
                {matchPayment
                  ? "Confirmado por el organizador"
                  : "Confirmado por el receptor"}
              </dt>
              <dd>{externalTotal("CONFIRMED")}</dd>
            </div>
            <div>
              <dt>En revisión</dt>
              <dd>{externalTotal("PENDING_REVIEW")}</dd>
            </div>
          </dl>
        )}
      {canEditDestination && destination && (
        <>
          {matchPayment && (
            <h4 className={styles.accountTitle}>
              Cuenta receptora del organizador
            </h4>
          )}
          <button
            className="secondary"
            type="button"
            onClick={() => {
              setDestinationSaved(false);
              setEditingDestination(true);
            }}
          >
            {destination.configured
              ? "Editar cuenta receptora"
              : "Configurar cuenta receptora"}
          </button>
          <FormSheet
            open={editingDestination}
            title={
              matchPayment
                ? "Cuenta receptora del organizador"
                : "Cuenta receptora"
            }
            onClose={() => {
              if (!busy) setEditingDestination(false);
            }}
          >
            <p className={styles.help}>
              {organizationSettings
                ? "Cuenta única para este complejo. Solo el propietario puede cambiarla; los cambios quedan registrados."
                : "Solo el organizador de este partido puede cambiar la cuenta. Los cambios quedan registrados."}
            </p>
            {error && (
              <p role="alert" className="errorNotice">
                {error}
              </p>
            )}
            <form
              className={styles.destinationForm}
              key={`${destination.holderName}:${destination.phone}`}
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                void mutate(async () => {
                  const saved = await apiRequest<Destination>(
                    destinationPath,
                    accessToken,
                    {
                      method: "PUT",
                      body: JSON.stringify({
                        ...(!organizationSettings
                          ? { targetType, targetId }
                          : {}),
                        holderName: data.get("holderName"),
                        phone: data.get("phone"),
                        yapeEnabled: data.has("yapeEnabled"),
                        plinEnabled: data.has("plinEnabled"),
                      }),
                    },
                  );
                  setDestination(saved);
                  setEditingDestination(false);
                  setDestinationSaved(true);
                });
              }}
            >
              <label>
                Titular
                <input
                  name="holderName"
                  required
                  maxLength={120}
                  defaultValue={destination.holderName ?? ""}
                />
              </label>
              <label>
                Celular peruano
                <input
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={12}
                  required
                  pattern="(\+51)?9[0-9]{8}"
                  placeholder="987654321"
                  defaultValue={destination.phone ?? ""}
                />
              </label>
              <label className={styles.methodChoice}>
                <input
                  name="yapeEnabled"
                  type="checkbox"
                  defaultChecked={destination.yapeEnabled}
                />{" "}
                Yape
              </label>
              <label className={styles.methodChoice}>
                <input
                  name="plinEnabled"
                  type="checkbox"
                  defaultChecked={destination.plinEnabled}
                />{" "}
                Plin
              </label>
              <label className={styles.methodChoice}>
                <input type="checkbox" required />
                Confirmo que el titular y celular corresponden a la cuenta que
                recibirá los pagos.
              </label>
              <button className="primary" disabled={busy} type="submit">
                Guardar cuenta receptora
              </button>
            </form>
          </FormSheet>
        </>
      )}
      {allowUpload ? (
        <>
          {!pending && (
            <button
              className="primary"
              type="button"
              disabled={
                busy ||
                !paymentsLoaded ||
                !!loadError ||
                !destination?.configured
              }
              onClick={() => setPaymentOpen(true)}
            >
              {prepared ? "Continuar pago" : "Preparar pago"}
            </button>
          )}
          {!destination?.configured && (
            <p role="status">
              El {recipientLabel} todavía debe configurar su cuenta receptora.
            </p>
          )}
          <FormSheet
            open={paymentOpen}
            title="Pago por Yape o Plin"
            onClose={() => {
              if (!busy) setPaymentOpen(false);
            }}
          >
            <div className={styles.panel}>
              {error && (
                <p role="alert" className="errorNotice">
                  {error}
                </p>
              )}
              {paymentControls}
            </div>
          </FormSheet>
        </>
      ) : (
        paymentControls
      )}
      {!organizationSettings && targetType === "RESERVATION" && (
        <>
          <button
            type="button"
            className={styles.historyButton}
            aria-label="Historial de estados"
            data-status={latestProof?.status}
            onClick={() => setHistoryOpen(true)}
          >
            {latestProof?.status === "CONFIRMED" ? (
              <CheckCircle weight="fill" aria-hidden="true" />
            ) : (
              <ClockCounterClockwise aria-hidden="true" />
            )}
            <span className={styles.historyText}>
              {latestProof
                ? labels[latestProof.status]
                : "Historial de estados"}
              {latestProof && (
                <small>
                  {new Intl.NumberFormat("es-PE", {
                    style: "currency",
                    currency: latestProof.currency,
                  }).format(latestProof.amountMinor / 100)}{" "}
                  · {latestProof.method}
                </small>
              )}
            </span>
            <span aria-hidden="true">›</span>
          </button>
          <ReservationHistory
            open={historyOpen}
            onClose={() => setHistoryOpen(false)}
            reservationId={targetId}
            accessToken={accessToken}
            proofs={proofs}
            onViewProof={viewProof}
            busy={busy}
          />
        </>
      )}
      {reservationAmounts}
      {targetType === "RESERVATION" && proofs.length > 0 && (
        <h3>
          <FileText aria-hidden="true" size={22} />
          Comprobante
        </h3>
      )}
      <div
        aria-live="polite"
        className={targetType === "RESERVATION" ? styles.proofList : undefined}
      >
        {proofs.map((proof) => (
          <article key={proof.id} className="externalProof">
            <h4 data-status={proof.status}>
              {proof.status === "CONFIRMED" && (
                <CheckCircle weight="fill" aria-hidden="true" />
              )}
              {labels[proof.status]}
            </h4>
            <dl className={styles.proofDetails}>
              <dt>Importe</dt>
              <dd>
                {new Intl.NumberFormat("es-PE", {
                  style: "currency",
                  currency: proof.currency,
                }).format(proof.amountMinor / 100)}{" "}
                · {proof.method}
              </dd>
              <dt>Cliente</dt>
              <dd>{proof.payerName}</dd>
              <dt>Enviado</dt>
              <dd>
                {new Date(proof.createdAt).toLocaleString("es-PE", {
                  timeZone: "America/Lima",
                })}
              </dd>
              <dt>Receptor</dt>
              <dd>
                {proof.holderName} · {proof.phone}
              </dd>
              {proof.reference && (
                <>
                  <dt>Operación</dt>
                  <dd>{proof.reference}</dd>
                </>
              )}
              {proof.reviewNote && (
                <>
                  <dt>Motivo</dt>
                  <dd>{proof.reviewNote}</dd>
                </>
              )}
            </dl>
            {proof.status === "PENDING_REVIEW" && (
              <p className={styles.help}>
                Revisión hasta{" "}
                {new Date(proof.reviewExpiresAt).toLocaleString("es-PE", {
                  timeZone: "America/Lima",
                })}
                . Si vence el horario retenido, el pago requiere resolución.
              </p>
            )}
            {!proof.hasImage && (
              <p className="muted">
                La captura ya no está disponible por la política de
                conservación. El registro de pago y su revisión se conservan.
              </p>
            )}
            {proof.hasImage && (
              <button
                className="secondary"
                disabled={busy}
                type="button"
                onClick={() => viewProof(proof)}
              >
                <FileText aria-hidden="true" />
                Ver comprobante
                <ArrowSquareOut aria-hidden="true" />
              </button>
            )}
            {proof.canReview &&
              ["PENDING_REVIEW", "NEEDS_RESOLUTION"].includes(proof.status) && (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const data = new FormData(event.currentTarget);
                    void mutate(() =>
                      apiRequest(
                        `/external-payments/${proof.id}/decision`,
                        accessToken,
                        {
                          method: "POST",
                          body: JSON.stringify({
                            decision: data.get("decision"),
                            note: data.get("note"),
                          }),
                        },
                      ),
                    );
                  }}
                >
                  <label>
                    Decisión
                    <select name="decision">
                      {proof.status === "NEEDS_RESOLUTION" ? (
                        <option value="REJECTED">
                          Cerrar incidencia sin confirmar reserva
                        </option>
                      ) : (
                        <>
                          <option value="CONFIRMED">
                            Confirmar pago verificado
                          </option>
                          <option value="CORRECTION_REQUIRED">
                            Pedir corrección
                          </option>
                          <option value="REJECTED">Rechazar</option>
                        </>
                      )}
                    </select>
                  </label>
                  <label>
                    Motivo de la decisión
                    <textarea name="note" required maxLength={500} />
                  </label>
                  <button type="submit" disabled={busy}>
                    Registrar decisión
                  </button>
                </form>
              )}
          </article>
        ))}
      </div>
      <FormSheet
        open={!!image}
        title="Comprobante de pago"
        onClose={() => setImage(null)}
      >
        {image && (
          <Image
            unoptimized
            src={image}
            alt="Comprobante de pago enviado"
            width={720}
            height={1080}
          />
        )}
      </FormSheet>
    </section>
  );
}
