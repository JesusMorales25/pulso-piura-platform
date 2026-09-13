"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, NavigationArrow } from "@phosphor-icons/react";
import { googleMapsUrl, trustedGoogleMapsUrl } from "@/lib/public-links";

export function FriendlyLocationPicker({
  addressFieldName,
  districtFieldName,
  mapsUrlFieldName,
  mapsUrl,
}: {
  addressFieldName: string;
  districtFieldName?: string;
  mapsUrlFieldName?: string;
  mapsUrl?: string | null;
}) {
  const latitudeInput = useRef<HTMLInputElement>(null);
  const longitudeInput = useRef<HTMLInputElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const [feedback, setFeedback] = useState("");
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    const form = container.current?.closest("form");
    if (!form) return;
    const clear = () => setFeedback("");
    form.addEventListener("reset", clear);
    return () => form.removeEventListener("reset", clear);
  }, []);

  function checkAddress(button: HTMLButtonElement) {
    const form = button.form;
    if (!form) return;
    const data = new FormData(form);
    const address = String(data.get(addressFieldName) ?? "").trim();
    const district = districtFieldName
      ? String(data.get(districtFieldName) ?? "").trim()
      : "";
    const directUrl = mapsUrlFieldName
      ? String(data.get(mapsUrlFieldName) ?? "").trim()
      : "";
    if (directUrl && !trustedGoogleMapsUrl(directUrl)) {
      form
        .querySelector<HTMLInputElement>(`[name="${mapsUrlFieldName}"]`)
        ?.focus();
      setFeedback("Pega un enlace válido compartido desde Google Maps.");
      return;
    }
    if (!address) {
      form
        .querySelector<HTMLInputElement>(`[name="${addressFieldName}"]`)
        ?.focus();
      setFeedback("Primero escribe la dirección.");
      return;
    }
    window.open(
      googleMapsUrl({
        mapsUrl: directUrl,
        address: [address, district, "Piura, Perú"].filter(Boolean).join(", "),
      }),
      "_blank",
      "noopener,noreferrer",
    );
    setFeedback("Google Maps se abrió para comprobar la dirección.");
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setFeedback("Este dispositivo no permite obtener la ubicación.");
      return;
    }
    setLocating(true);
    setFeedback("Obteniendo tu ubicación…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (latitudeInput.current && longitudeInput.current) {
          latitudeInput.current.value = String(position.coords.latitude);
          longitudeInput.current.value = String(position.coords.longitude);
        }
        setFeedback("Ubicación exacta agregada.");
        setLocating(false);
      },
      () => {
        setFeedback(
          "No pudimos obtenerla. Puedes continuar usando la dirección escrita.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 12_000 },
    );
  }

  return (
    <div className="friendlyLocationPicker" ref={container}>
      {mapsUrlFieldName && (
        <label className="mapsLinkField">
          Enlace exacto de Google Maps
          <input
            defaultValue={mapsUrl ?? ""}
            inputMode="url"
            name={mapsUrlFieldName}
            placeholder="Pega el enlace de Compartir ubicación"
            type="url"
          />
          <small>
            En Google Maps abre el lugar, pulsa Compartir y copia el enlace.
          </small>
        </label>
      )}
      <input name="latitude" ref={latitudeInput} type="hidden" />
      <input name="longitude" ref={longitudeInput} type="hidden" />
      <div>
        <button
          className="locationPreviewButton"
          onClick={(event) => checkAddress(event.currentTarget)}
          type="button"
        >
          <MapPin aria-hidden="true" size={18} weight="fill" />
          {mapsUrlFieldName ? "Abrir ubicación" : "Comprobar en Google Maps"}
        </button>
        <button
          className="locationCurrentButton"
          disabled={locating}
          onClick={useCurrentLocation}
          type="button"
        >
          <NavigationArrow aria-hidden="true" size={18} weight="fill" />
          {locating ? "Ubicando…" : "Usar mi ubicación actual"}
        </button>
      </div>
      <small aria-live="polite" className="formHint">
        {feedback ||
          (mapsUrlFieldName
            ? "El enlace exacto se usará en el botón Cómo llegar."
            : "Escribe una dirección reconocible o usa la ubicación del dispositivo.")}
      </small>
    </div>
  );
}
