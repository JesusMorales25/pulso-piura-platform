"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";
import { ApiError, apiRequest } from "@/lib/api";
import styles from "./ExternalPaymentPanel.module.css";
import Image from "next/image";
import Link from "next/link";
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
}: {
  accessToken: string;
  targetType: "MATCH" | "RESERVATION";
  targetId: string;
  reviewer?: boolean;
  allowUpload?: boolean;
  organizationSettings?: boolean;
  plans?: { plan: "FULL" | "DEPOSIT" | "BALANCE"; label: string }[];
  onChange?: () => void;
}) {
  const enabled = useExternalPayments();
  const [destination, setDestination] = useState<Destination | null>(null);
  const [proofs, setProofs] = useState<ExternalProof[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [image, setImage] = useState<string | null>(null);
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
  const query = `targetType=${targetType}&targetId=${encodeURIComponent(targetId)}`;
  const destinationPath = organizationSettings
    ? `/organizations/${encodeURIComponent(targetId)}/external-payment-destination`
    : "/external-payments/destination";
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    async function load() {
      try {
        const [recipient, items] = await Promise.all([
          apiRequest<Destination>(
            organizationSettings
              ? destinationPath
              : `${destinationPath}?${query}`,
            accessToken,
            { signal: controller.signal },
          ),
          organizationSettings
            ? Promise.resolve([] as ExternalProof[])
            : apiRequest<ExternalProof[]>(
                `/external-payments?${query}`,
                accessToken,
                { signal: controller.signal },
              ),
        ]);
        if (!controller.signal.aborted) {
          // Keep the account shown before the transfer, even if it changes during review.
          setDestination((current) =>
            current?.configured ? current : recipient,
          );
          setProofs(items);
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
          setError(
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
        await apiRequest("/external-payments", accessToken, {
          method: "POST",
          headers: { "Idempotency-Key": key.current },
          body: data,
          redirect: "error",
        });
      } catch (reason) {
        if (reason instanceof ApiError && reason.status === 409)
          throw new Error(
            `${reason.message} No vuelvas a transferir; contacta al receptor para resolver el pago. Conservamos la captura y el número de operación en este formulario.`,
          );
        throw reason;
      }
      key.current = crypto.randomUUID();
      form.reset();
    });
  }
  if (!enabled) return null;
  const pending = proofs.some(
    (proof) => !proof.canReview && proof.status === "PENDING_REVIEW",
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
  const shownDestination = allowUpload
    ? preparedActive
      ? prepared.destination
      : null
    : reviewer
      ? destination
      : null;
  return (
    <section
      className={`${styles.panel} card`}
      aria-label={
        reviewer ? "Revisión de pagos externos" : "Pago por Yape o Plin"
      }
    >
      <h3>
        {organizationSettings
          ? "Cuenta receptora del complejo"
          : reviewer
            ? "Pagos por validar"
            : allowUpload
              ? "Paga con Yape o Plin"
              : "Historial de pago"}
      </h3>
      <p>
        {organizationSettings
          ? "Configura los datos que verán los jugadores antes de su primera reserva. Verifica el titular y celular antes de guardarlos."
          : !allowUpload
            ? "Consulta el comprobante y su revisión. Si el pago requiere resolución, contacta al responsable; no vuelvas a transferir."
            : "Primero prepara el pago para verificar disponibilidad; después transfiere desde tu aplicación. Enviar una captura no confirma el pago: el responsable debe verificarlo."}
      </p>
      {error && (
        <p role="alert" className="errorNotice">
          {error}
        </p>
      )}
      {reviewer && destination && (
        <p className="notice">
          Los pagos de simulación anteriores no acreditan dinero recibido;
          revisa los comprobantes confirmados.
        </p>
      )}
      {!organizationSettings && (
        <dl className="reservationSummary">
          <div>
            <dt>Confirmado por el receptor</dt>
            <dd>{externalTotal("CONFIRMED")}</dd>
          </div>
          <div>
            <dt>En revisión</dt>
            <dd>{externalTotal("PENDING_REVIEW")}</dd>
          </div>
        </dl>
      )}
      {reviewer && destination && (
        <details>
          <summary>Configurar cuenta receptora</summary>
          <form
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
                inputMode="tel"
                required
                pattern="(\+51)?9[0-9]{8}"
                placeholder="987654321"
                defaultValue={destination.phone ?? ""}
              />
            </label>
            <label>
              <input
                name="yapeEnabled"
                type="checkbox"
                defaultChecked={destination.yapeEnabled}
              />{" "}
              Yape
            </label>
            <label>
              <input
                name="plinEnabled"
                type="checkbox"
                defaultChecked={destination.plinEnabled}
              />{" "}
              Plin
            </label>
            <button disabled={busy} type="submit">
              Guardar cuenta receptora
            </button>
          </form>
        </details>
      )}
      {shownDestination?.configured && (
        <p>
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
      {!destination?.configured && (
        <p role="status">
          El responsable todavía debe configurar su cuenta receptora. No
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
            <select name="method">
              {destination.yapeEnabled && <option value="YAPE">Yape</option>}
              {destination.plinEnabled && <option value="PLIN">Plin</option>}
            </select>
          </label>
          <label>
            Importe a pagar
            <select name="plan">
              {plans.map((item) => (
                <option key={item.plan} value={item.plan}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={busy}>
            {busy
              ? "Verificando disponibilidad…"
              : prepared
                ? "Actualizar preparación"
                : "Preparar pago"}
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
            <p role="status">
              Importe verificado:{" "}
              <strong>
                {new Intl.NumberFormat("es-PE", {
                  style: "currency",
                  currency: prepared.currency,
                }).format(prepared.amountMinor / 100)}
              </strong>{" "}
              · {prepared.method} · Retenido hasta{" "}
              {new Date(prepared.expiresAt).toLocaleTimeString("es-PE", {
                timeZone: "America/Lima",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
              . Transfiere y envía el comprobante antes de ese momento.
            </p>
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
          <label>
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
          <button type="submit" disabled={busy || !preparedActive}>
            {busy ? "Enviando…" : "Enviar para validación"}
          </button>
        </form>
      )}
      <div aria-live="polite">
        {proofs.map((proof) => (
          <article key={proof.id} className="externalProof">
            <h4>{labels[proof.status]}</h4>
            <p>
              {proof.payerName} ·{" "}
              {new Intl.NumberFormat("es-PE", {
                style: "currency",
                currency: proof.currency,
              }).format(proof.amountMinor / 100)}{" "}
              · {proof.method}
            </p>
            <p>
              Enviado:{" "}
              {new Date(proof.createdAt).toLocaleString("es-PE", {
                timeZone: "America/Lima",
              })}
            </p>
            {proof.status === "PENDING_REVIEW" && (
              <p>
                Revisión hasta{" "}
                {new Date(proof.reviewExpiresAt).toLocaleString("es-PE", {
                  timeZone: "America/Lima",
                })}
                . Si vence el horario retenido, el pago requiere resolución.
              </p>
            )}
            {proof.reference && <p>Operación: {proof.reference}</p>}
            <p>
              Receptor informado: {proof.holderName} · {proof.phone}
            </p>
            {proof.reviewNote && <p>Motivo: {proof.reviewNote}</p>}
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
                onClick={() =>
                  void mutate(async () => {
                    const blob = await apiRequest<Blob>(
                      `/external-payments/${proof.id}/image`,
                      accessToken,
                      { cache: "no-store", redirect: "error" },
                    );
                    if (blob.type !== "image/png")
                      throw new Error(
                        "El comprobante no tiene un formato válido.",
                      );
                    setImage(URL.createObjectURL(blob));
                  })
                }
              >
                Ver comprobante
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
