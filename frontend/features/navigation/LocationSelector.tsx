"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { CaretDown, Check, MapPin } from "@phosphor-icons/react";
import { useLocation } from "./LocationProvider";

export function LocationSelector() {
  const pathname = usePathname();
  const visible = pathname === "/" || pathname === "/partidos" || pathname === "/canchas";
  return visible ? <DistrictLocationSelector /> : null;
}

function DistrictLocationSelector() {
  const { district, districts, loading, error, selectDistrict } = useLocation();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) { if (!root.current?.contains(event.target as Node)) setOpen(false); }
    function escape(event: KeyboardEvent) { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } }
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  return <div className="locationSelector" ref={root}>
    <button className="locationPill" type="button" ref={trigger} aria-expanded={open} aria-controls="location-options" aria-label={`Cambiar zona: ${district || "Todas las zonas de Piura"}`} onClick={() => setOpen(!open)}><MapPin aria-hidden="true" size={18} weight="fill" /><span>{district || "Piura, Perú"}</span><CaretDown aria-hidden="true" size={13} /></button>
    {open && <section className="locationPopover" id="location-options" aria-label="Seleccionar zona"><h2>¿Dónde quieres jugar?</h2><p>Distritos con canchas publicadas</p>{loading ? <p role="status">Cargando zonas…</p> : error ? <p role="alert">{error}</p> : <div>{["", ...districts].map((value) => <button type="button" key={value || "all"} aria-pressed={district === value} onClick={() => { selectDistrict(value); setOpen(false); trigger.current?.focus(); }}><MapPin aria-hidden="true" /><span>{value || "Todas las zonas de Piura"}</span>{district === value && <Check aria-hidden="true" />}</button>)}</div>}</section>}
  </div>;
}
