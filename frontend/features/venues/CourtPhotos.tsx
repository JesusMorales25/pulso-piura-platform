/* eslint-disable @next/next/no-img-element -- Authenticated blobs and local upload previews cannot use image optimization. */
"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { FormSheet } from "@/components/forms/FormSheet";
import { apiRequest } from "@/lib/api";
import styles from "./CourtPhotos.module.css";

export type CourtPhoto = {
  id: string;
  caption: string | null;
  cover: boolean;
  position: number;
  imageUrl: string;
};
const message = (error: unknown) =>
  error instanceof Error ? error.message : "No se pudieron cargar las fotos.";

export function CourtPhotoImage({
  path,
  token = null,
  alt,
  className,
}: {
  path: string;
  token?: string | null;
  alt: string;
  className?: string;
}) {
  const [src, setSrc] = useState<string>();
  useEffect(() => {
    const controller = new AbortController();
    let url: string | undefined;
    queueMicrotask(() => {
      if (!controller.signal.aborted) setSrc(undefined);
    });
    // Only callers construct these local API paths. Never send credentials to DTO URLs.
    void apiRequest<Blob>(path, token, { signal: controller.signal })
      .then((blob) => {
        if (controller.signal.aborted) return;
        if (blob.type !== "image/png")
          throw new Error("La imagen no tiene un formato válido");
        url = URL.createObjectURL(blob);
        setSrc(url);
      })
      .catch(() => {});
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [path, token]);
  return src ? (
    <img className={className} src={src} alt={alt} />
  ) : (
    <span
      className={className}
      role="img"
      aria-label={`Imagen no disponible: ${alt}`}
    />
  );
}

export function CourtPhotoGallery({
  open,
  onClose,
  spaceId,
  name,
  organizationId,
  token,
  fallback,
}: {
  open: boolean;
  onClose: () => void;
  spaceId: string;
  name: string;
  organizationId?: string;
  token?: string | null;
  fallback?: string;
}) {
  const base = organizationId
    ? `/organizations/${organizationId}/spaces/${spaceId}/photos`
    : `/public/spaces/${spaceId}/photos`;
  const [photos, setPhotos] = useState<CourtPhoto[]>([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const mutationLock = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [preview, setPreview] = useState<string>();
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setLoading(true);
        setError(null);
      }
    });
    void apiRequest<CourtPhoto[]>(base, token, { signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        setPhotos(result);
        setSelected(0);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(message(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [base, open, token, revision]);
  async function mutate(path: string, init: RequestInit, success: string) {
    if (mutationLock.current) return false;
    mutationLock.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await apiRequest(base + path, token, init);
      setNotice(success);
      setPendingDelete(null);
      setRevision((value) => value + 1);
      return true;
    } catch (reason) {
      setError(message(reason));
      return false;
    } finally {
      mutationLock.current = false;
      setBusy(false);
    }
  }
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = new FormData(form);
    const file = body.get("file");
    if (!(file instanceof File) || !file.size) {
      setError("Elige una foto para continuar.");
      return;
    }
    if (
      !["image/jpeg", "image/png"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError("Elige una imagen JPG o PNG de hasta 5 MB.");
      return;
    }
    if (await mutate("", { method: "POST", body }, "Foto agregada.")) {
      form.reset();
      setPreview(undefined);
    }
  }
  const current = photos[selected];
  return (
    <FormSheet open={open} onClose={onClose} title={`Fotos de ${name}`}>
      <div className={styles.gallery} aria-busy={busy || loading}>
        {error && (
          <p className="errorNotice" role="alert">
            {error}{" "}
            <button
              className="secondary"
              type="button"
              onClick={() => setRevision((value) => value + 1)}
            >
              Reintentar
            </button>
          </p>
        )}
        {notice && (
          <p className="successNotice" role="status">
            {notice}
          </p>
        )}
        {loading ? (
          <p role="status">Cargando fotos…</p>
        ) : current ? (
          <>
            <div
              className={styles.stage}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                  event.preventDefault();
                  setSelected(
                    (value) =>
                      (value +
                        (event.key === "ArrowRight" ? 1 : photos.length - 1)) %
                      photos.length,
                  );
                }
              }}
            >
              <CourtPhotoImage
                path={`${base}/${current.id}/image`}
                token={token}
                alt={current.caption || `${name}, foto ${selected + 1}`}
                className={styles.large}
              />
              <div className={styles.controls}>
                <button
                  className="secondary"
                  type="button"
                  aria-label="Foto anterior"
                  onClick={() =>
                    setSelected((selected + photos.length - 1) % photos.length)
                  }
                >
                  ←
                </button>
                <span aria-live="polite">
                  {selected + 1} / {photos.length}
                  {current.cover ? " · Portada" : ""}
                </span>
                <button
                  className="secondary"
                  type="button"
                  aria-label="Foto siguiente"
                  onClick={() => setSelected((selected + 1) % photos.length)}
                >
                  →
                </button>
              </div>
              {current.caption && <p>{current.caption}</p>}
            </div>
            <div className={styles.thumbnails} aria-label="Fotos de la cancha">
              {photos.map((photo, index) => (
                <button
                  aria-label={`Ver foto ${index + 1}${photo.cover ? ", portada" : ""}`}
                  aria-pressed={index === selected}
                  type="button"
                  key={photo.id}
                  onClick={() => {
                    setSelected(index);
                    setPendingDelete(null);
                  }}
                >
                  <CourtPhotoImage
                    path={`${base}/${photo.id}/image`}
                    token={token}
                    alt={photo.caption || `Foto ${index + 1}`}
                  />
                </button>
              ))}
            </div>
          </>
        ) : (
          <div>
            {fallback && (
              <img
                src={fallback}
                className={styles.large}
                alt="Cancha de referencia"
              />
            )}
            <p>
              {organizationId
                ? "Agrega la primera foto de esta cancha."
                : "Este complejo todavía no publicó fotos de esta cancha."}
            </p>
            {fallback && <small>Imagen de referencia</small>}
          </div>
        )}
        {organizationId && (
          <>
            {current && (
              <div className={styles.controls}>
                <button
                  className="secondary"
                  type="button"
                  disabled={busy || current.cover}
                  onClick={() =>
                    void mutate(
                      `/${current.id}/cover`,
                      { method: "PUT" },
                      "Portada actualizada.",
                    )
                  }
                >
                  {current.cover ? "Portada actual" : "Elegir como portada"}
                </button>
                <button
                  className="dangerButton"
                  type="button"
                  disabled={busy}
                  onClick={() => setPendingDelete(current.id)}
                >
                  Eliminar foto
                </button>
              </div>
            )}
            {pendingDelete && (
              <div className="inlineConfirm">
                <p>¿Eliminar esta foto? Esta acción no se puede deshacer.</p>
                <button
                  className="dangerButton"
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void mutate(
                      `/${pendingDelete}`,
                      { method: "DELETE" },
                      "Foto eliminada.",
                    )
                  }
                >
                  Eliminar foto definitivamente
                </button>
                <button
                  className="secondary"
                  type="button"
                  disabled={busy}
                  onClick={() => setPendingDelete(null)}
                >
                  Conservar foto
                </button>
              </div>
            )}
            <form onSubmit={upload} className={styles.upload}>
              <h3>Agregar foto</h3>
              <p>
                Recomendamos al menos 3 fotos. Puedes completarlas después.
                Hasta 8 imágenes JPG o PNG, de 5 MB cada una.
              </p>
              <label>
                Foto
                <input
                  name="file"
                  type="file"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    const invalid =
                      file &&
                      (!file.size ||
                        file.size > 5 * 1024 * 1024 ||
                        !["image/jpeg", "image/png"].includes(file.type));
                    setError(
                      invalid
                        ? "Elige una imagen JPG o PNG de hasta 5 MB."
                        : null,
                    );
                    setPreview(
                      file && !invalid ? URL.createObjectURL(file) : undefined,
                    );
                  }}
                  accept="image/jpeg,image/png"
                  required
                  disabled={busy || photos.length >= 8}
                />
              </label>
              <label>
                Descripción opcional
                <input name="caption" maxLength={200} disabled={busy} />
              </label>
              {preview && (
                <img
                  className={styles.large}
                  src={preview}
                  alt="Vista previa de la foto seleccionada"
                />
              )}
              <button
                className="primary"
                disabled={busy || loading || photos.length >= 8}
              >
                {busy ? "Guardando…" : "Subir foto"}
              </button>
            </form>
          </>
        )}
      </div>
    </FormSheet>
  );
}
