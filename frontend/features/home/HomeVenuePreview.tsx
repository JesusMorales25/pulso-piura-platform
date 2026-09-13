"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Clock, MapPin } from "@phosphor-icons/react";
import type { HomeVenue } from "@/features/home/HomeDashboard";
import { apiRequest } from "@/lib/api";

type Space = { id: string; name: string };
type Slot = {
  startsAt: string;
  endsAt: string;
  priceMinor: number;
  currency: string;
};
type Availability = {
  sportSpaceId: string;
  date: string;
  slots: Slot[];
};
type VenueOffer = {
  venue: HomeVenue;
  space: Space;
  availability: Availability;
  slot: Slot;
};

const previewImages = [
  "/images/venue-football-7.png",
  "/images/venue-volleyball.png",
];

const todayInPiura = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const time = (value: string) =>
  new Intl.DateTimeFormat("es-PE", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Lima",
  }).format(new Date(value));

const money = (slot: Slot) =>
  new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: slot.currency,
    maximumFractionDigits: 0,
  }).format(slot.priceMinor / 100);

export function HomeVenuePreview({
  loading,
  venues,
}: {
  loading: boolean;
  venues: HomeVenue[];
}) {
  const [offers, setOffers] = useState<VenueOffer[]>([]);
  const [offersLoading, setOffersLoading] = useState(true);
  const date = todayInPiura();

  useEffect(() => {
    let active = true;

    async function loadOffers() {
      if (!venues.length) {
        setOffers([]);
        setOffersLoading(false);
        return;
      }
      setOffersLoading(true);
      const loaded = await Promise.all(
        venues.map(async (venue) => {
          try {
            const spaces = await apiRequest<Space[]>(
              `/venues/${venue.publicSlug}/spaces`,
            );
            const candidates = (
              await Promise.all(
                spaces.map(async (space) => {
                  try {
                    const availability = await apiRequest<Availability>(
                      `/spaces/${space.id}/bookable-slots?date=${date}`,
                    );
                    const slot = availability.slots[0];
                    return slot
                      ? { venue, space, availability, slot }
                      : null;
                  } catch {
                    return null;
                  }
                }),
              )
            )
              .filter((offer): offer is VenueOffer => offer !== null)
              .sort((left, right) =>
                left.slot.startsAt.localeCompare(right.slot.startsAt),
              );
            return candidates[0] ?? null;
          } catch {
            return null;
          }
        }),
      );
      if (active) {
        setOffers(
          loaded.filter((offer): offer is VenueOffer => offer !== null),
        );
        setOffersLoading(false);
      }
    }

    void loadOffers();
    return () => {
      active = false;
    };
  }, [date, venues]);

  return (
    <section
      className="compactVenuePreview"
      aria-labelledby="home-venues-title"
    >
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">DISPONIBILIDAD REAL</p>
          <h2 id="home-venues-title">Canchas disponibles hoy</h2>
        </div>
        <Link className="textLink" href="/canchas">
          Ver todas
        </Link>
      </div>

      {loading || offersLoading ? (
        <div className="venueMiniSkeleton" aria-label="Cargando canchas" />
      ) : offers.length ? (
        <div className="venueMiniGrid">
          {offers.slice(0, 4).map((offer, index) => {
            const query = new URLSearchParams({
              date: offer.availability.date,
              venue: offer.venue.publicSlug,
              space: offer.space.id,
              startsAt: offer.slot.startsAt,
              endsAt: offer.slot.endsAt,
              reserve: "1",
            });
            return (
              <article
                className="venueShowcaseCard"
                key={offer.venue.publicSlug}
              >
                <div className="venueShowcaseImage">
                  <Image
                    alt={`Cancha deportiva en ${offer.venue.name}`}
                    fill
                    sizes="(max-width: 760px) 76vw, 360px"
                    src={previewImages[index % previewImages.length]}
                  />
                  <span>Desde {time(offer.slot.startsAt)}</span>
                </div>
                <div className="venueShowcaseCopy">
                  <strong>{offer.venue.name}</strong>
                  <small>
                    <MapPin aria-hidden="true" size={14} weight="fill" />
                    {offer.venue.address}
                  </small>
                  <div>
                    <span>
                      <Clock aria-hidden="true" size={17} />
                      {time(offer.slot.startsAt)}
                    </span>
                    <b>
                      {money(offer.slot)} <small>por hora</small>
                    </b>
                  </div>
                  <Link
                    aria-label={`Reservar ${offer.space.name} en ${offer.venue.name} a las ${time(offer.slot.startsAt)}`}
                    className="venueShowcaseReserve"
                    href={`/canchas?${query}`}
                  >
                    Reservar
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="venueDataEmpty">
          No hay canchas con horarios disponibles para hoy.
        </div>
      )}
    </section>
  );
}
