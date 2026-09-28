"use client";

import { forwardRef } from "react";
import { ArrowRight, Clock, MapPin, Star, X } from "@phosphor-icons/react";
import styles from "./VenueScheduleDialog.module.css";

type Venue = {
  name: string;
  address: string;
  districtCode: string;
  adminRating: number | null;
  adminRatingCount: number | null;
  amenityCodes: string[];
};

type Space = {
  id: string;
  name: string;
  sportCode: string;
  formatCode: string;
  capacity: number;
  surfaceType: string | null;
  indoor: boolean;
  amenityCodes: string[];
};

type Slot = {
  startsAt: string;
  endsAt: string;
  priceMinor: number;
  currency: string;
};

type Props = {
  venue: Venue;
  spaces: Space[];
  selectedSpace: Space | null;
  slots: Slot[];
  selectedSlots: Slot[];
  date: string;
  names: Map<string, string>;
  error: string;
  loading: boolean;
  busy: boolean;
  onClose: () => void;
  onSelectSpace: (space: Space) => void;
  onToggleSlot: (slot: Slot) => void;
  onReserve: () => void;
};

const time = (value: string) =>
  new Intl.DateTimeFormat("es-PE", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Lima",
  }).format(new Date(value));

const money = (minor: number, currency = "PEN") =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency }).format(minor / 100);

export const VenueScheduleDialog = forwardRef<HTMLDivElement, Props>(
  function VenueScheduleDialog(
    {
      venue,
      spaces,
      selectedSpace,
      slots,
      selectedSlots,
      date,
      names,
      error,
      loading,
      busy,
      onClose,
      onSelectSpace,
      onToggleSlot,
      onReserve,
    },
    ref,
  ) {
    const selectedTotal = selectedSlots.reduce((total, slot) => total + slot.priceMinor, 0);
    const selectedDuration = selectedSlots.reduce(
      (total, slot) => total + (Date.parse(slot.endsAt) - Date.parse(slot.startsAt)) / 60000,
      0,
    );
    const detailAmenities = selectedSpace
      ? Array.from(new Set([...venue.amenityCodes, ...selectedSpace.amenityCodes]))
      : venue.amenityCodes;
    const rating = venue.adminRating === null || venue.adminRating === undefined
      ? "Sin calificación"
      : `${venue.adminRating.toFixed(1)} (${venue.adminRatingCount ?? 0})`;

    return (
      <div className={styles.backdrop} onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
        <div
          aria-labelledby="schedule-modal-title"
          aria-modal="true"
          className={styles.dialog}
          id="venue-schedules"
          ref={ref}
          role="dialog"
          tabIndex={-1}
        >
          <header className={styles.header}>
            <div>
              <p className={styles.eyebrow}>DETALLE Y TURNOS DISPONIBLES</p>
              <h2 id="schedule-modal-title">{venue.name}</h2>
              <p><MapPin aria-hidden="true" size={15} /> {venue.address} · {venue.districtCode}</p>
              <span title={venue.adminRating === null || venue.adminRating === undefined ? undefined : "Calificación informada por el complejo"}>
                <Star aria-hidden="true" size={15} weight="fill" /> {rating}
              </span>
            </div>
            <button aria-label="Cerrar horarios" className={styles.close} onClick={onClose} type="button">
              <X aria-hidden="true" size={22} weight="bold" />
            </button>
          </header>

          <div className={styles.body}>
            <div className={styles.date}>
              {new Intl.DateTimeFormat("es-PE", { dateStyle: "full", timeZone: "America/Lima" })
                .format(new Date(`${date}T12:00:00-05:00`))}
            </div>
            {error && <p className={styles.error} role="alert">{error}</p>}
            {loading && !selectedSpace ? (
              <div className={styles.loading} role="status">Consultando canchas y horarios…</div>
            ) : spaces.length === 0 ? (
              <p className={styles.empty}>Este complejo no tiene canchas publicadas para reservar.</p>
            ) : (
              <>
                <div className={styles.courts} role="group" aria-label="Seleccionar cancha">
                  {spaces.map((space) => (
                    <button
                      aria-pressed={selectedSpace?.id === space.id}
                      className={selectedSpace?.id === space.id ? styles.selectedCourt : undefined}
                      key={space.id}
                      onClick={() => onSelectSpace(space)}
                      type="button"
                    >
                      <strong>{space.name}</strong>
                      <span>{names.get(space.sportCode) ?? space.sportCode} · {space.formatCode.replaceAll("_", " ")}</span>
                    </button>
                  ))}
                </div>

                {selectedSpace && (
                  <section className={styles.slotSection}>
                    <div className={styles.facts}>
                      <span>{selectedSpace.indoor ? "Cancha techada" : "Cancha al aire libre"}</span>
                      <span>{selectedSpace.formatCode.replaceAll("_", " ")}</span>
                      {selectedSpace.surfaceType && (
                        <span>{names.get(selectedSpace.surfaceType) ?? selectedSpace.surfaceType}</span>
                      )}
                      {detailAmenities.map((code) => <span key={code}>{names.get(code) ?? code}</span>)}
                    </div>
                    <div className={styles.slotHeading}>
                      <div><small>TURNOS DISPONIBLES</small><h3>{selectedSpace.name}</h3></div>
                      <span>Selecciona bloques consecutivos</span>
                    </div>
                    {loading ? (
                      <div className={styles.loading} role="status">Actualizando horarios…</div>
                    ) : slots.length ? (
                      <div className={styles.slots} role="group" aria-label={`Horarios de ${selectedSpace.name}`}>
                        {slots.map((slot) => {
                          const selected = selectedSlots.some((item) => item.startsAt === slot.startsAt);
                          return (
                            <button
                              aria-pressed={selected}
                              className={selected ? styles.selectedSlot : undefined}
                              disabled={busy}
                              key={`${slot.startsAt}-${slot.endsAt}`}
                              onClick={() => onToggleSlot(slot)}
                              type="button"
                            >
                              <Clock aria-hidden="true" size={17} />
                              <strong>{time(slot.startsAt)} – {time(slot.endsAt)}</strong>
                              <span>{money(slot.priceMinor, slot.currency)}</span>
                              <small>{selected ? "Elegido" : "Disponible"}</small>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className={styles.empty} role="status">No quedan horarios disponibles para esta cancha en la fecha seleccionada.</p>
                    )}
                  </section>
                )}
              </>
            )}
          </div>

          <footer className={styles.footer} role="status">
            <span>
              <small>{selectedSlots.length ? "Tu selección" : "Selecciona un horario para reservar"}</small>
              {selectedSlots.length ? (
                <><strong>{time(selectedSlots[0].startsAt)} – {time(selectedSlots.at(-1)!.endsAt)}</strong><em>{selectedDuration} min · {money(selectedTotal)}</em></>
              ) : <em>Puedes elegir una o varias horas consecutivas.</em>}
            </span>
            <button disabled={busy || selectedSlots.length === 0} onClick={onReserve} type="button">
              {busy ? "Bloqueando horario…" : "Reservar e ir al pago"}<ArrowRight aria-hidden="true" size={19} />
            </button>
          </footer>
        </div>
      </div>
    );
  },
);
