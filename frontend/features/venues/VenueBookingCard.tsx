"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import {
  CourtPhotoGallery,
  CourtPhotoImage,
  type CourtPhoto,
} from "./CourtPhotos";
import {
  CalendarBlank,
  Car,
  CaretRight,
  CreditCard,
  Images,
  Lightbulb,
  Volleyball,
  Basketball,
  TennisBall,
  MapPin,
  SoccerBall,
  Star,
  WhatsappLogo,
} from "@phosphor-icons/react";
import { googleMapsUrl, whatsappUrl } from "@/lib/public-links";
import styles from "./VenueBookingCard.module.css";

export type BookingSlot = {
  startsAt: string;
  endsAt: string;
  priceMinor: number;
  currency: string;
};

export type VenueBookingOffer = {
  venue: {
    publicSlug: string;
    name: string;
    address: string;
    districtCode: string;
    publicPhone: string | null;
    latitude: number | null;
    longitude: number | null;
    adminRating: number | null;
    adminRatingCount: number | null;
  };
  space: {
    id: string;
    name: string;
    sportCode: string;
    formatCode: string;
    indoor: boolean;
  };
};

type Props = {
  offer: VenueBookingOffer;
  slots: BookingSlot[];
  imageSrc: string;
  amenityNames: string[];
  selectedStartsAt?: string;
  busy?: boolean;
  onSelectSlot: (slot: BookingSlot) => void;
  onReserve: (plan: "DEPOSIT" | "FULL") => void;
  onOpenSchedules: () => void;
};

const time = (value: string) =>
  new Intl.DateTimeFormat("es-PE", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Lima",
  }).format(new Date(value));

const money = (slot: BookingSlot) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: slot.currency,
    maximumFractionDigits: 0,
  }).format(slot.priceMinor / 100);

export function VenueBookingCard({
  offer,
  slots,
  imageSrc,
  amenityNames,
  selectedStartsAt,
  busy = false,
  onSelectSlot,
  onReserve,
  onOpenSchedules,
}: Props) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [coverId, setCoverId] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) setCoverId(null);
    });
    void apiRequest<CourtPhoto[]>(
      `/public/spaces/${offer.space.id}/photos`,
      null,
      { signal: controller.signal },
    )
      .then((photos) => {
        if (!controller.signal.aborted)
          setCoverId(
            (photos.find((photo) => photo.cover) ?? photos[0])?.id ?? null,
          );
      })
      .catch(() => {});
    return () => controller.abort();
  }, [offer.space.id]);
  const visibleSlots = slots.slice(0, 4);
  const lowestSlot = slots.reduce<BookingSlot | undefined>(
    (lowest, slot) =>
      !lowest || slot.priceMinor < lowest.priceMinor ? slot : lowest,
    undefined,
  );
  const selectedSlot =
    slots.find((slot) => slot.startsAt === selectedStartsAt) ?? visibleSlots[0];
  const { venue, space } = offer;
  const SportIcon =
    space.sportCode === "VOLLEYBALL"
      ? Volleyball
      : space.sportCode === "BASKETBALL"
        ? Basketball
        : /TENNIS|PADEL/.test(space.sportCode)
          ? TennisBall
          : SoccerBall;
  const formatLabel = space.formatCode
    .replace("FOOTBALL", "Fútbol")
    .replace("VOLLEYBALL", "Vóley")
    .replace("BASKETBALL", "Básquet")
    .replaceAll("_", " ");
  const ratingLabel =
    venue.adminRating === null || venue.adminRating === undefined
      ? "Sin calificación"
      : venue.adminRating.toFixed(1);
  const mapsHref = googleMapsUrl({
    latitude: venue.latitude,
    longitude: venue.longitude,
    address: `${venue.name}, ${venue.address}, Piura`,
  });
  const whatsappHref = whatsappUrl(venue.publicPhone);
  const priorityAmenities = [...amenityNames].sort((left, right) => {
    const priority = (value: string) =>
      /led|iluminaci[oó]n|estacionamiento/i.test(value) ? 0 : 1;
    return priority(left) - priority(right);
  });

  return (
    <article
      className={styles.card}
      aria-label={`Disponibilidad de ${venue.name}`}
    >
      <div className={styles.overview}>
        <header className={styles.header}>
          {coverId ? (
            <CourtPhotoImage
              path={`/public/spaces/${space.id}/photos/${coverId}/image`}
              alt={`Portada de ${space.name}`}
              className={styles.image}
            />
          ) : (
            <Image
              alt="Imagen de referencia de una cancha"
              className={styles.image}
              height={144}
              loading="eager"
              src={imageSrc}
              width={144}
            />
          )}
          <div className={styles.identity}>
            <h2>{venue.name}</h2>
            <p>
              <MapPin aria-hidden="true" size={13} weight="fill" />{" "}
              {venue.address} · {venue.districtCode}
            </p>
            <div className={styles.chips}>
              <span>
                <SportIcon aria-hidden="true" size={16} /> {formatLabel}
              </span>
              {space.indoor && <span>Techada</span>}
              {priorityAmenities.slice(0, 3).map((name) => (
                <span key={name}>
                  {/estacionamiento/i.test(name) ? (
                    <Car aria-hidden="true" size={16} />
                  ) : /led|iluminaci[oó]n/i.test(name) ? (
                    <Lightbulb aria-hidden="true" size={16} />
                  ) : null}
                  {name}
                </span>
              ))}
            </div>
          </div>
        </header>

        <CourtPhotoGallery
          open={galleryOpen}
          onClose={() => setGalleryOpen(false)}
          spaceId={space.id}
          name={space.name}
          fallback={imageSrc}
        />
        <div
          className={styles.priceRating}
          role="group"
          aria-label="Precio y valoración"
        >
          <div className={styles.price}>
            <strong>{lowestSlot ? money(lowestSlot) : "—"}</strong>
            <small>
              {lowestSlot &&
              new Date(lowestSlot.endsAt).getTime() -
                new Date(lowestSlot.startsAt).getTime() ===
                3600000
                ? "por hora"
                : "por turno"}
            </small>
          </div>
          <div className={styles.rating}>
            <span>
              <Star aria-hidden="true" size={16} weight="fill" /> {ratingLabel}
            </span>
            {venue.adminRating != null && (
              <small>Informada por el complejo</small>
            )}
          </div>
        </div>
        <div className={styles.detailsRow}>
          <div className={styles.links}>
            <button
              className="secondary"
              type="button"
              onClick={() => setGalleryOpen(true)}
            >
              <Images aria-hidden="true" size={20} /> Ver fotos
            </button>
            {whatsappHref && (
              <a href={whatsappHref} rel="noreferrer" target="_blank">
                <WhatsappLogo aria-hidden="true" size={15} /> Contactar
              </a>
            )}
            <a href={mapsHref} rel="noreferrer" target="_blank">
              <MapPin aria-hidden="true" size={15} /> Cómo llegar
            </a>
          </div>
        </div>
      </div>

      <div className={styles.booking}>
        <section
          className={styles.availability}
          aria-label={`Turnos disponibles en ${space.name}`}
        >
          <div className={styles.availabilityHeading}>
            <strong>Turnos disponibles</strong>
            <button
              className={styles.spaceButton}
              onClick={onOpenSchedules}
              type="button"
              aria-label={`Ver canchas y horarios de ${venue.name}`}
            >
              {space.name}
              <CaretRight aria-hidden="true" size={16} />
            </button>
          </div>
          <div
            className={styles.slots}
            role="group"
            aria-label="Elige un turno disponible"
          >
            {visibleSlots.map((slot) => {
              const selected = slot.startsAt === selectedSlot?.startsAt;
              return (
                <button
                  aria-pressed={selected}
                  className={selected ? styles.selected : undefined}
                  disabled={busy}
                  key={`${slot.startsAt}-${slot.endsAt}`}
                  onClick={() => onSelectSlot(slot)}
                  type="button"
                >
                  <strong>{time(slot.startsAt)}</strong>
                  <small>{selected ? "Elegido" : "Disponible"}</small>
                  <span>{money(slot)}</span>
                </button>
              );
            })}
          </div>
          {visibleSlots.length === 0 && (
            <p className={styles.empty}>
              No quedan turnos disponibles. Consulta otros horarios.
            </p>
          )}
        </section>

        <footer className={styles.footer}>
          <div className={styles.selection}>
            <CalendarBlank aria-hidden="true" size={17} />
            <span>
              <small>Turno seleccionado</small>
              <strong>
                {selectedSlot
                  ? `${time(selectedSlot.startsAt)} – ${time(selectedSlot.endsAt)}`
                  : "Elige un horario"}
              </strong>
            </span>
          </div>
          <div className={styles.actions}>
            <button
              disabled={busy || !selectedSlot}
              onClick={() => onReserve("DEPOSIT")}
              type="button"
            >
              <CalendarBlank aria-hidden="true" size={22} weight="bold" />{" "}
              <span>
                Reservar con <span className={styles.noWrap}>20 %</span>
              </span>
            </button>
            <button
              disabled={busy || !selectedSlot}
              onClick={() => onReserve("FULL")}
              type="button"
            >
              <CreditCard aria-hidden="true" size={22} weight="fill" /> Pagar
              completo
            </button>
            <button
              className={styles.secondary}
              onClick={onOpenSchedules}
              type="button"
            >
              Otros horarios <CaretRight aria-hidden="true" size={20} />
            </button>
          </div>
        </footer>
      </div>
    </article>
  );
}
