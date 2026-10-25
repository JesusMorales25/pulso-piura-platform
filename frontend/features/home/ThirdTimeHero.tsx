"use client";
import Image from "next/image";
import { useState } from "react";
import { CaretRight, MapPin, Ticket, UsersThree } from "@phosphor-icons/react";
import { FormSheet } from "@/components/forms/FormSheet";
import styles from "./ThirdTimeHero.module.css";
const facts = [
  {
    title: "Ubicaciones verificables",
    icon: MapPin,
    description:
      "Consulta en Google Maps la ubicación publicada por cada local. Revisa sus datos antes de desplazarte.",
  },
  {
    title: "Planes para el equipo",
    icon: UsersThree,
    description:
      "Encuentra un lugar para reunirte después del partido. Contacta directamente al establecimiento para consultar aforo, disponibilidad y atención para tu grupo.",
  },
  {
    title: "Beneficios próximamente",
    icon: Ticket,
    description:
      "Los beneficios y promociones para equipos aún no están activos. Cuando estén disponibles, verás aquí sus condiciones y vigencia.",
  },
];
export function ThirdTimeHero() {
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <>
      <section className={styles.hero} aria-labelledby="third-time-hero-title">
        <Image
          src="/images/demo-court-night.png"
          alt=""
          fill
          priority
          sizes="(max-width: 760px) 100vw, 1200px"
          className={styles.photo}
        />
        <div className={styles.copy}>
          <p className="eyebrow">DESPUÉS DEL PARTIDO</p>
          <h1 id="third-time-hero-title">
            El tercer tiempo <em>también se juega</em>
          </h1>
          <p className={styles.lead}>
            Encuentra choperías y restaurantes cerca de las canchas. Contacta
            directamente al local o consulta su ubicación en Google Maps.
          </p>
        </div>
        <div className={styles.facts}>
          {facts.map((fact, index) => (
            <button
              type="button"
              key={fact.title}
              className={index === 2 ? styles.coming : undefined}
              aria-haspopup="dialog"
              onClick={() => setSelected(index)}
            >
              <span>
                <fact.icon size={26} aria-hidden="true" weight="duotone" />
              </span>
              <strong>{fact.title}</strong>
              <CaretRight size={22} aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>
      <FormSheet
        open={selected !== null}
        title={
          selected === null ? "Después del partido" : facts[selected].title
        }
        onClose={() => setSelected(null)}
      >
        <p>{selected === null ? "" : facts[selected].description}</p>
      </FormSheet>
    </>
  );
}
