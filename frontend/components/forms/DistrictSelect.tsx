"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

export function DistrictSelect({ value, onChange }: { value?: string; onChange?: (value: string) => void }) {
  const [districts, setDistricts] = useState<string[]>([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    apiRequest<string[]>("/venue-catalogs/districts").then((items) => { if (active) setDistricts(items); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);
  const selected = value === undefined ? undefined : districts.find((name) => name.localeCompare(value, "es", { sensitivity: "base" }) === 0) ?? "";
  return <label>Distrito
    <select name="districtCode" required value={selected} defaultValue={value === undefined ? "" : undefined} onChange={(event) => onChange?.(event.target.value)} disabled={districts.length === 0}>
      <option value="">{failed ? "No se pudo cargar. Vuelve a abrir el formulario." : districts.length ? "Selecciona un distrito" : "Cargando distritos…"}</option>
      {districts.map((district) => <option key={district} value={district}>{district}</option>)}
    </select>
    {value && districts.length > 0 && !selected && <small>Ubicación anterior: {value}. Selecciona el distrito correspondiente.</small>}
  </label>;
}
