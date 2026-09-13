"use client";

/* eslint-disable @next/next/no-img-element -- Las imágenes HTTPS son configuradas por el administrador. */
import { useEffect, useState } from "react";
import {
  BeerBottle,
  ForkKnife,
  MapPin,
  WhatsappLogo,
} from "@phosphor-icons/react";
import { apiRequest } from "@/lib/api";
import { googleMapsUrl, whatsappUrl } from "@/lib/public-links";

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

export function ThirdTimeSection() {
  const [places, setPlaces] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void apiRequest<Business[]>("/businesses")
      .then((items) => {
        if (active) setPlaces(items);
      })
      .catch(() => {
        if (active) setError("No pudimos cargar los lugares recomendados.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="thirdTimeSection" aria-labelledby="third-time-title">
      <div className="thirdTimeHeading">
        <div>
          <span className="demoSectionTag">ALIADOS LOCALES</span>
          <h2 id="third-time-title">
            El tercer tiempo <small>Disfruta post-partido</small>
          </h2>
        </div>
        {!loading && (
          <span className="thirdTimeCount">{places.length} lugares</span>
        )}
      </div>

      {loading && <p className="thirdTimeNotice">Buscando lugares para ti…</p>}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && places.length === 0 && (
        <div className="empty thirdTimeEmpty">
          <h3>Aún no hay establecimientos publicados</h3>
          <p>Cuando el administrador publique uno, aparecerá aquí.</p>
        </div>
      )}

      {places.length > 0 && (
        <div className="thirdTimeRail">
          {places.map((place) => {
            const Icon =
              place.category === "RESTAURANT" ? ForkKnife : BeerBottle;
            const contactHref = whatsappUrl(place.contactPhone);
            const locationHref = googleMapsUrl({
              mapsUrl: place.mapsUrl,
              latitude: place.latitude,
              longitude: place.longitude,
              address: place.zone,
            });
            return (
              <article className="thirdTimeCard" key={place.id}>
                <div className="thirdTimeImage">
                  <img
                    alt={`${categoryLabels[place.category]} ${place.name}`}
                    src={place.imageUrl || "/images/third-time-restaurant.jpg"}
                  />
                  <span>
                    <Icon aria-hidden="true" size={15} weight="fill" />{" "}
                    {categoryLabels[place.category]}
                  </span>
                </div>
                <div className="thirdTimeCopy">
                  <strong>{place.name}</strong>
                  <small>
                    <MapPin aria-hidden="true" size={14} weight="fill" />{" "}
                    {place.zone}
                  </small>
                  {place.description && <p>{place.description}</p>}
                  <div className="thirdTimeActions">
                    {contactHref && (
                      <a href={contactHref} rel="noreferrer" target="_blank">
                        <WhatsappLogo
                          aria-hidden="true"
                          size={17}
                          weight="fill"
                        />{" "}
                        Escribir
                      </a>
                    )}
                    <a href={locationHref} rel="noreferrer" target="_blank">
                      <MapPin aria-hidden="true" size={17} weight="fill" /> Cómo
                      llegar
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <p className="thirdTimeNotice">
        Información publicada y revisada desde la administración de Pulso Piura.
      </p>
    </section>
  );
}
