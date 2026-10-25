"use client";
/* eslint-disable @next/next/no-img-element -- Published HTTPS images are managed by platform administrators. */
import { useEffect, useRef, useState } from "react";
import {
  BeerBottle,
  CaretRight,
  ForkKnife,
  MapPin,
  WhatsappLogo,
} from "@phosphor-icons/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { apiAssetUrl, apiRequest } from "@/lib/api";
import { googleMapsUrl, whatsappUrl } from "@/lib/public-links";
import { CardSkeletons } from "@/features/feedback/CardSkeletons";
import { useLocation } from "@/features/navigation/LocationProvider";
import { FormSheet } from "@/components/forms/FormSheet";
import styles from "./ThirdTimeSection.module.css";

type Business = {
  id: string;
  name: string;
  category: "CHOPERIA" | "RESTAURANT" | "SPORTS_BAR" | "OTHER";
  zone: string;
  description: string | null;
  imageUrl: string | null;
  contactPhone: string | null;
  mapsUrl: string | null;
  latitude: number | null;
  longitude: number | null;
};
const categoryLabels: Record<Business["category"], string> = {
  CHOPERIA: "Chopería",
  RESTAURANT: "Restaurante",
  SPORTS_BAR: "Sports bar",
  OTHER: "Aliado",
};
const fallbackImage = "/images/demo-third-time-terrace.png";
function PlaceImage({
  place,
  className,
}: {
  place: Business;
  className: string;
}) {
  return (
    <img
      className={className}
      alt={
        place.imageUrl ? place.name : "Imagen de referencia para " + place.name
      }
      src={place.imageUrl ? apiAssetUrl(place.imageUrl) : fallbackImage}
      loading="lazy"
      onError={(event) => {
        if (!event.currentTarget.src.endsWith(fallbackImage))
          event.currentTarget.src = fallbackImage;
      }}
    />
  );
}
export function ThirdTimeSection() {
  const detailRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { district } = useLocation();
  const pathname = usePathname();
  const [places, setPlaces] = useState<Business[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [revision, setRevision] = useState(0),
    [allOpen, setAllOpen] = useState(false),
    [selected, setSelected] = useState<Business | null>(null);
  useEffect(() => {
    if (selected) detailRef.current?.focus({ preventScroll: true });
    else if (allOpen) listRef.current?.querySelector("button")?.focus();
  }, [selected, allOpen]);
  const visiblePlaces = places.filter(
    (place) =>
      pathname !== "/" ||
      !district ||
      place.zone.trim().toLocaleLowerCase("es-PE") ===
        district.toLocaleLowerCase("es-PE"),
  );
  useEffect(() => {
    const controller = new AbortController();
    void apiRequest<Business[]>("/businesses", null, {
      signal: controller.signal,
    })
      .then((items) => {
        if (!controller.signal.aborted) setPlaces(items);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("No pudimos cargar los lugares recomendados.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);
  const contactHref = selected ? whatsappUrl(selected.contactPhone) : null;
  const locationHref = selected
    ? googleMapsUrl({
        mapsUrl: selected.mapsUrl,
        latitude: selected.latitude,
        longitude: selected.longitude,
        address: selected.zone,
      })
    : null;
  return (
    <section className={styles.section} aria-labelledby="third-time-title">
      <div className={styles.heading}>
        <div>
          <p className="eyebrow">ALIADOS LOCALES</p>
          <h2 id="third-time-title">El tercer tiempo</h2>
          <p className={styles.subtitle}>Disfruta post-partido</p>
        </div>
        {!loading && !error && visiblePlaces.length > 0 && (
          <div className={styles.headingActions}>
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setAllOpen(true);
              }}
              aria-haspopup="dialog"
            >
              Ver todos <CaretRight size={18} aria-hidden="true" />
            </button>
            <small>
              {visiblePlaces.length}{" "}
              {visiblePlaces.length === 1 ? "lugar" : "lugares"}
            </small>
          </div>
        )}
      </div>
      {loading && (
        <CardSkeletons
          count={2}
          label="Buscando lugares para ti"
          variant="place"
        />
      )}
      {error && (
        <div className="notice error" role="alert">
          <p>{error}</p>
          <button
            className="secondary"
            type="button"
            onClick={() => {
              setError("");
              setLoading(true);
              setRevision((value) => value + 1);
            }}
          >
            Reintentar
          </button>
        </div>
      )}
      {!loading && !error && visiblePlaces.length === 0 && (
        <div className="empty">
          <h3>
            Aún no hay establecimientos publicados
            {pathname === "/" && district ? " en esta zona" : ""}
          </h3>
          <p>Cuando el administrador publique uno, aparecerá aquí.</p>
          {pathname === "/" && district && (
            <Link className="secondary" href="/tercer-tiempo">
              Ver otras zonas
            </Link>
          )}
        </div>
      )}
      {!error && visiblePlaces.length > 0 && (
        <div
          className={styles.rail}
          aria-label="Lugares para después del partido"
        >
          {visiblePlaces.map((place) => (
            <article className={styles.card} key={place.id}>
              {!place.imageUrl && (
                <span className={styles.reference}>Imagen de referencia</span>
              )}
              <PlaceImage place={place} className={styles.photo} />
              <div className={styles.cardContent}>
                <div>
                  <small className={styles.category}>
                    {categoryLabels[place.category]}
                  </small>
                  <h3>{place.name}</h3>
                  <p>
                    <MapPin size={17} aria-hidden="true" />
                    {place.zone}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={"Ver detalles de " + place.name}
                  aria-haspopup="dialog"
                  onClick={() => {
                    setAllOpen(false);
                    setSelected(place);
                  }}
                >
                  Ver detalles <CaretRight size={19} aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <p className={styles.notice}>
        Información publicada y revisada desde la administración de Pulso Piura.
      </p>
      <FormSheet
        open={allOpen || selected !== null}
        title={selected?.name ?? "Todos los lugares"}
        onClose={() => {
          setAllOpen(false);
          setSelected(null);
        }}
      >
        {selected ? (
          <div className={styles.detail} ref={detailRef} tabIndex={-1}>
            {allOpen && (
              <button
                className="secondary"
                type="button"
                onClick={() => setSelected(null)}
              >
                ← Volver a los lugares
              </button>
            )}
            <PlaceImage place={selected} className={styles.detailPhoto} />
            {!selected.imageUrl && (
              <small className="muted">
                Imagen de referencia. El local aún no publicó su foto.
              </small>
            )}
            <p className="eyebrow">{categoryLabels[selected.category]}</p>
            <p className={styles.zone}>
              <MapPin aria-hidden="true" size={19} />
              {selected.zone}
            </p>
            <p>
              {selected.description ||
                "Consulta directamente con el establecimiento para conocer su atención y disponibilidad."}
            </p>
            <div className={styles.detailActions}>
              {contactHref && (
                <a
                  className="primary"
                  href={contactHref}
                  rel="noreferrer"
                  target="_blank"
                >
                  <WhatsappLogo size={21} aria-hidden="true" />
                  Contactar al local
                </a>
              )}
              {locationHref && (
                <a
                  className="secondary"
                  href={locationHref}
                  rel="noreferrer"
                  target="_blank"
                >
                  <MapPin size={21} aria-hidden="true" />
                  {selected.mapsUrl ||
                  (selected.latitude !== null && selected.longitude !== null)
                    ? "Cómo llegar"
                    : "Ver zona en Maps"}
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.list} ref={listRef}>
            {visiblePlaces.map((place) => {
              const Icon =
                place.category === "RESTAURANT" ? ForkKnife : BeerBottle;
              return (
                <button
                  type="button"
                  key={place.id}
                  onClick={() => setSelected(place)}
                >
                  <Icon size={26} aria-hidden="true" />
                  <span>
                    <strong>{place.name}</strong>
                    <small>
                      {categoryLabels[place.category]} · {place.zone}
                    </small>
                  </span>
                  <CaretRight size={20} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        )}
      </FormSheet>
    </section>
  );
}
