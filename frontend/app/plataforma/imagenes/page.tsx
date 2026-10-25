"use client";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { FormSheet } from "@/components/forms/FormSheet";
import {
  visualSlots,
  visualSlotLabels,
  visualAssetPath,
  type VisualAsset,
  type VisualSlot,
} from "@/components/PlatformHeroImage";
import { useAuth } from "@/features/auth/AuthProvider";
import { useUserCapabilities } from "@/features/access/useUserCapabilities";
import { apiAssetUrl, apiRequest } from "@/lib/api";
import { proofImageError } from "@/features/payments/proof-validation";
import styles from "./VisualAssets.module.css";

export default function PlatformImagesPage() {
  const { accessToken, login } = useAuth();
  const { capabilities, loading } = useUserCapabilities();
  const [items, setItems] = useState<VisualAsset[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<VisualSlot | null>(null);
  const [preview, setPreview] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [remove, setRemove] = useState(false);
  useEffect(() => {
    if (!accessToken || !capabilities.canManagePlatform) return;
    const controller = new AbortController();
    void apiRequest<VisualAsset[]>("/platform/visual-assets", accessToken, {
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted) {
          setItems(data);
          setLoaded(true);
        }
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "No se pudieron cargar las imágenes.",
          );
      });
    return () => controller.abort();
  }, [accessToken, capabilities.canManagePlatform, reload]);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const close = () => {
    if (!busy) {
      setEditing(null);
      setPreview("");
      setFile(null);
      setRemove(false);
      setError("");
    }
  };
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || !accessToken || busy) return;
    const validation = proofImageError(file);
    if (validation) {
      setError(validation);
      return;
    }
    const data = new FormData();
    data.set("file", file!);
    setBusy(true);
    setError("");
    try {
      await apiRequest(`/platform/visual-assets/${editing}`, accessToken, {
        method: "PUT",
        body: data,
      });
      setEditing(null);
      setPreview("");
      setFile(null);
      setReload((n) => n + 1);
      setNotice("Imagen actualizada. Se mostrará en la plataforma.");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No se pudo guardar la imagen.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function reset() {
    if (!editing || !accessToken || busy) return;
    setBusy(true);
    setError("");
    try {
      await apiRequest(`/platform/visual-assets/${editing}`, accessToken, {
        method: "DELETE",
      });
      setEditing(null);
      setRemove(false);
      setReload((n) => n + 1);
      setNotice("Se restauró la imagen de referencia.");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No se pudo restaurar la imagen.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <main className="section">
        <p role="status">Validando acceso…</p>
      </main>
    );
  if (!accessToken)
    return (
      <main className="section">
        <h1>Imágenes de plataforma</h1>
        <button
          className="primary"
          onClick={() => void login(false, "/plataforma/imagenes")}
        >
          Ingresar
        </button>
      </main>
    );
  if (!capabilities.canManagePlatform)
    return (
      <main className="section">
        <h1>Acceso restringido</h1>
        <p>Solo administración puede cambiar estas imágenes.</p>
      </main>
    );
  return (
    <main className="section platformDashboard">
      <p className="eyebrow">IDENTIDAD DE PULSO PIURA</p>
      <h1>Imágenes de plataforma</h1>
      <Link href="/plataforma">← Volver a la consola</Link>
      <p>
        Personaliza las portadas sin volver a desplegar. Las fotos de cada
        cancha se administran desde su complejo.
      </p>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {error && !editing && (
        <div className="errorNotice" role="alert">
          <p>{error}</p>
          <button
            className="secondary"
            onClick={() => {
              setError("");
              setReload((n) => n + 1);
            }}
          >
            Reintentar
          </button>
        </div>
      )}
      {!loaded && !error ? (
        <p role="status">Cargando imágenes…</p>
      ) : (
        <section className={styles.grid} aria-label="Portadas configurables">
          {visualSlots.map((slot) => {
            const uploaded = items.some((item) => item.slot === slot);
            return (
              <article className={`card ${styles.card}`} key={slot}>
                <Image
                  className={styles.image}
                  src={
                    uploaded
                      ? apiAssetUrl("/api/v1" + visualAssetPath(slot)) +
                        "?revision=" +
                        reload
                      : "/images/demo-court-night.png"
                  }
                  width={800}
                  height={450}
                  alt={visualSlotLabels[slot]}
                  unoptimized={uploaded}
                />
                <h2>{visualSlotLabels[slot]}</h2>
                <p className="muted">
                  {uploaded
                    ? "Imagen personalizada"
                    : "Imagen de referencia para la demo"}
                </p>
                <button
                  className="secondary"
                  type="button"
                  onClick={() => {
                    setEditing(slot);
                    setFile(null);
                    setPreview("");
                    setRemove(false);
                    setError("");
                  }}
                >
                  Cambiar {visualSlotLabels[slot].toLowerCase()}
                </button>
              </article>
            );
          })}
        </section>
      )}
      <FormSheet
        open={!!editing}
        title={editing ? visualSlotLabels[editing] : "Imagen de plataforma"}
        onClose={close}
      >
        <div className={styles.form}>
          <p>
            Sube una foto horizontal de una cancha. JPG o PNG, máximo 5 MB. Se
            procesará antes de publicarla.
          </p>
          {error && (
            <p className="errorNotice" role="alert">
              {error}
            </p>
          )}
          {preview && (
            <Image
              className={styles.image}
              src={preview}
              alt="Vista previa de la nueva portada"
              width={800}
              height={450}
              unoptimized
            />
          )}
          <form
            key={editing ?? "closed"}
            onSubmit={(event) => void save(event)}
            className={styles.form}
          >
            <label>
              Foto de portada
              <input
                type="file"
                accept="image/jpeg,image/png"
                disabled={busy}
                onChange={(event) => {
                  const next = event.target.files?.[0] ?? null;
                  const invalid = proofImageError(next);
                  setError(invalid ?? "");
                  setFile(invalid ? null : next);
                  setPreview(!invalid && next ? URL.createObjectURL(next) : "");
                }}
              />
            </label>
            <button className="primary" disabled={busy || !file} type="submit">
              {busy ? "Guardando…" : "Publicar imagen"}
            </button>
          </form>
          {editing &&
            items.some((item) => item.slot === editing) &&
            (!remove ? (
              <button
                className="secondary"
                type="button"
                disabled={busy}
                onClick={() => setRemove(true)}
              >
                Restaurar imagen de referencia
              </button>
            ) : (
              <div className="notice">
                <p>¿Retirar esta portada y volver a la imagen de referencia?</p>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => setRemove(false)}
                >
                  Conservar portada
                </button>
                <button
                  className="dangerButton"
                  disabled={busy}
                  onClick={() => void reset()}
                >
                  Sí, restaurar imagen
                </button>
              </div>
            ))}
        </div>
      </FormSheet>
    </main>
  );
}
