"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { ImageSquare, ListBullets, PencilSimple, Phone, Plus, Storefront } from "@phosphor-icons/react";
import { FloatingNotice } from "@/components/feedback/FloatingNotice";
import { FriendlyLocationPicker } from "@/components/forms/FriendlyLocationPicker";
import { useUserCapabilities } from "@/features/access/useUserCapabilities";
import { useAuth } from "@/features/auth/AuthProvider";
import { apiAssetUrl, apiRequest } from "@/lib/api";

type Business = {
  id: string;
  name: string;
  category: "CHOPERIA" | "RESTAURANT" | "SPORTS_BAR" | "OTHER";
  zone: string;
  description: string | null;
  imageUrl: string | null;
  contactPhone: string | null;
  mapsUrl: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};

type Notice = { message: string; tone: "success" | "error" };
type BusinessMode = "add" | "list";

const categoryLabels: Record<Business["category"], string> = {
  CHOPERIA: "Chopería",
  RESTAURANT: "Restaurante",
  SPORTS_BAR: "Sports bar",
  OTHER: "Otro negocio",
};

export default function PlatformBusinessesPage() {
  const { accessToken } = useAuth();
  const { capabilities, loading } = useUserCapabilities();
  const [items, setItems] = useState<Business[]>([]);
  const [editing, setEditing] = useState<Business | null>(null);
  const [activeMode, setActiveMode] = useState<BusinessMode>("add");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const dismissNotice = useCallback(() => setNotice(null), []);

  useEffect(() => {
    return () => {
      if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  useEffect(() => {
    if (!accessToken || !capabilities.canManagePlatform) return;
    void apiRequest<Business[]>("/platform/businesses", accessToken)
      .then(setItems)
      .catch((reason) =>
        setNotice({
          message:
            reason instanceof Error
              ? reason.message
              : "No se pudo cargar el directorio.",
          tone: "error",
        }),
      );
  }, [accessToken, capabilities.canManagePlatform]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const status = String(data.get("status")) as Business["status"];
    const contactPhone = nullableText(data.get("contactPhone"));

    if (status === "PUBLISHED" && !contactPhone) {
      setNotice({
        message: "Para publicar agrega el teléfono de contacto.",
        tone: "error",
      });
      return;
    }

    setSaving(true);
    setNotice(null);
    try {
      let saved = await apiRequest<Business>(
        editing ? `/platform/businesses/${editing.id}` : "/platform/businesses",
        accessToken,
        {
          method: editing ? "PUT" : "POST",
          body: JSON.stringify({
            name: data.get("name"),
            category: data.get("category"),
            zone: data.get("zone"),
            description: nullableText(data.get("description")),
            imageUrl: editing?.imageUrl ?? null,
            contactPhone,
            mapsUrl: nullableText(data.get("mapsUrl")),
            latitude: nullableNumber(data.get("latitude")),
            longitude: nullableNumber(data.get("longitude")),
            status,
          }),
        },
      );
      if (selectedImage) {
        const upload = new FormData();
        upload.set("image", selectedImage);
        saved = await apiRequest<Business>(
          `/platform/businesses/${saved.id}/image`,
          accessToken,
          { method: "PUT", body: upload },
        );
      }
      setItems((current) =>
        editing
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...current],
      );
      setEditing(null);
      setSelectedImage(null);
      setImagePreview("");
      setActiveMode("list");
      form.reset();
      setNotice({
        message: editing
          ? "Negocio actualizado correctamente."
          : "Negocio guardado correctamente.",
        tone: "success",
      });
    } catch (reason) {
      setNotice({
        message:
          reason instanceof Error
            ? reason.message
            : "No se pudo guardar el negocio.",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(item: Business, status: Business["status"]) {
    if (!accessToken) return;
    setSaving(true);
    setNotice(null);
    try {
      const updated = await apiRequest<Business>(
        `/platform/businesses/${item.id}`,
        accessToken,
        {
          method: "PUT",
          body: JSON.stringify({ ...item, status }),
        },
      );
      setItems((current) =>
        current.map((entry) => (entry.id === updated.id ? updated : entry)),
      );
      setNotice({
        message:
          status === "PUBLISHED"
            ? "El negocio ya es público."
            : status === "DRAFT"
              ? "El negocio se ocultó del directorio."
              : "El negocio fue archivado.",
        tone: "success",
      });
    } catch (reason) {
      setNotice({
        message:
          reason instanceof Error
            ? reason.message
            : "No se pudo actualizar el negocio.",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  function startNewBusiness() {
    setEditing(null);
    setSelectedImage(null);
    setImagePreview("");
    setActiveMode("add");
  }

  function startEditing(item: Business) {
    setEditing(item);
    setSelectedImage(null);
    setImagePreview(item.imageUrl ? apiAssetUrl(item.imageUrl) : "");
    setActiveMode("add");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectImage(file: File | undefined) {
    if (!file) return;
    if (!(["image/jpeg", "image/png", "image/webp"].includes(file.type))) {
      setNotice({ message: "Selecciona una imagen JPEG, PNG o WebP.", tone: "error" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setNotice({ message: "La imagen no puede superar los 5 MB.", tone: "error" });
      return;
    }
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
    setNotice(null);
  }

  if (loading)
    return (
      <main className="section">
        <p className="notice">Validando acceso…</p>
      </main>
    );
  if (!capabilities.canManagePlatform)
    return (
      <main className="section accessDeniedPage">
        <h1>Acceso restringido</h1>
      </main>
    );

  return (
    <main className="section platformBusinesses">
      <FloatingNotice
        message={notice?.message ?? ""}
        onDismiss={dismissNotice}
        tone={notice?.tone}
      />
      <p className="eyebrow">DIRECTORIO COMERCIAL</p>
      <h1>Choperías, restaurantes y aliados</h1>
      <Link className="platformBackLink" href="/plataforma">
        ← Volver a la consola
      </Link>
      <p className="pageLead">
        Solo los registros publicados aparecen para todas las personas en “El
        tercer tiempo”.
      </p>
      <div aria-label="Administrar negocios" className="businessModeSwitch" role="tablist">
        <button
          aria-selected={activeMode === "add"}
          className={activeMode === "add" ? "active" : ""}
          onClick={startNewBusiness}
          role="tab"
          type="button"
        >
          <Plus aria-hidden="true" size={19} weight="bold" />
          {editing ? "Editar negocio" : "Agregar negocio"}
        </button>
        <button
          aria-selected={activeMode === "list"}
          className={activeMode === "list" ? "active" : ""}
          onClick={() => setActiveMode("list")}
          role="tab"
          type="button"
        >
          <ListBullets aria-hidden="true" size={19} weight="bold" />
          Negocios publicados
          <small>{items.length}</small>
        </button>
      </div>
      <div className="platformBusinessWorkspace">
        {activeMode === "add" && (
        <form
          className="card adminForm platformBusinessForm"
          key={editing?.id ?? "new"}
          noValidate
          onSubmit={save}
        >
          <Storefront size={34} />
          <h2>{editing ? "Editar negocio" : "Agregar negocio"}</h2>
          <label>
            Nombre
            <input
              defaultValue={editing?.name}
              name="name"
              maxLength={160}
              required
            />
          </label>
          <label>
            Categoría
            <select
              defaultValue={editing?.category ?? "RESTAURANT"}
              name="category"
            >
              <option value="CHOPERIA">Chopería</option>
              <option value="RESTAURANT">Restaurante</option>
              <option value="SPORTS_BAR">Sports bar</option>
              <option value="OTHER">Otro</option>
            </select>
          </label>
          <label>
            Dirección para llegar
            <input
              defaultValue={editing?.zone}
              name="zone"
              maxLength={180}
              placeholder="Av. Grau 123, Piura"
              required
            />
          </label>
          <FriendlyLocationPicker
            addressFieldName="zone"
            mapsUrl={editing?.mapsUrl}
            mapsUrlFieldName="mapsUrl"
          />
          <label>
            Descripción
            <textarea
              className="resize-none"
              defaultValue={editing?.description ?? ""}
              name="description"
              maxLength={500}
              placeholder="Qué ofrece el establecimiento"
              rows={3}
            />
          </label>
          <label>
            WhatsApp o teléfono
            <input
              defaultValue={editing?.contactPhone ?? ""}
              inputMode="tel"
              name="contactPhone"
              maxLength={30}
              placeholder="+51 999 999 999"
            />
          </label>
          <label>
            Foto del negocio
            <span className="businessImagePicker">
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element -- La vista previa puede ser un blob local.
                <img alt="Vista previa del negocio" src={imagePreview} />
              ) : (
                <span><ImageSquare aria-hidden="true" size={30} /><b>Agrega una foto</b><small>JPEG, PNG o WebP · máximo 5 MB</small></span>
              )}
              <input
                accept="image/jpeg,image/png,image/webp"
                name="imageFile"
                onChange={(event) => selectImage(event.target.files?.[0])}
                type="file"
              />
            </span>
          </label>
          <label>
            Estado
            <select
              defaultValue={
                editing?.status === "ARCHIVED" ? "DRAFT" : editing?.status
              }
              name="status"
            >
              <option value="DRAFT">Borrador</option>
              <option value="PUBLISHED">Publicado</option>
            </select>
          </label>
          {editing && (
            <button
              className="secondary"
              onClick={() => {
                setEditing(null);
                setSelectedImage(null);
                setImagePreview("");
                setActiveMode("list");
              }}
              type="button"
            >
              Cancelar edición
            </button>
          )}
          <button className="primary borderless" disabled={saving}>
            {saving
              ? "Guardando…"
              : editing
                ? "Guardar cambios"
                : "Guardar negocio"}
          </button>
        </form>
        )}
        {activeMode === "list" && (
        <section
          className="platformBusinessList"
          aria-label="Negocios registrados"
        >
          {items.map((item) => (
            <article className="card" key={item.id}>
              {item.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- La imagen puede provenir de la API o de HTTPS.
                <img className="platformBusinessThumb" alt="" src={apiAssetUrl(item.imageUrl)} />
              )}
              <div className="platformBusinessCardBody">
                <span className={`pill businessStatus businessStatus--${item.status.toLowerCase()}`}>{statusLabel(item.status)}</span>
                <h3>{item.name}</h3>
                <p>{categoryLabels[item.category]} · {item.zone}</p>
                {item.description && <small>{item.description}</small>}
                <div className="platformBusinessMeta">
                  <span><Phone aria-hidden="true" size={16} /> {item.contactPhone || "Sin contacto"}</span>
                </div>
              </div>
              <div className="businessCardActions">
                <button
                  className="secondary"
                  disabled={saving}
                  onClick={() => startEditing(item)}
                  type="button"
                >
                  <PencilSimple aria-hidden="true" size={17} /> Editar
                </button>
                {item.status !== "PUBLISHED" && (
                  <button
                    className="primary borderless"
                    disabled={saving}
                    onClick={() => void changeStatus(item, "PUBLISHED")}
                    type="button"
                  >
                    Publicar
                  </button>
                )}
                {item.status === "PUBLISHED" && (
                  <button
                    className="secondary"
                    disabled={saving}
                    onClick={() => void changeStatus(item, "DRAFT")}
                    type="button"
                  >
                    Ocultar
                  </button>
                )}
                {item.status !== "ARCHIVED" && (
                  <button
                    className="secondary"
                    disabled={saving}
                    onClick={() => void changeStatus(item, "ARCHIVED")}
                    type="button"
                  >
                    Archivar
                  </button>
                )}
              </div>
            </article>
          ))}
          {!items.length && (
            <div className="empty">
              <h3>No hay negocios registrados</h3>
              <p>Agrega el primero desde el formulario.</p>
            </div>
          )}
        </section>
        )}
      </div>
    </main>
  );
}

function nullableText(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

function nullableNumber(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function statusLabel(status: Business["status"]) {
  if (status === "PUBLISHED") return "Publicado";
  if (status === "ARCHIVED") return "Archivado";
  return "Borrador";
}
