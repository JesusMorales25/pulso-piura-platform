"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

const LocationContext = createContext<{ district: string; districts: string[]; loading: boolean; error: string; selectDistrict: (value: string) => void }>({ district: "", districts: [], loading: true, error: "", selectDistrict: () => {} });
export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [district, setDistrict] = useState("");
  const [districts, setDistricts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void apiRequest<string[]>("/venues/districts", null, { signal: controller.signal }).then((items) => {
      if (controller.signal.aborted) return;
      setDistricts(items);
      const saved = localStorage.getItem("pulso:district") || "";
      if (items.includes(saved)) setDistrict(saved);
    }).catch(() => { if (!controller.signal.aborted) setError("No se pudieron cargar las zonas. Recarga para reintentar."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  function selectDistrict(value: string) {
    if (value && !districts.includes(value)) return;
    setDistrict(value);
    localStorage.setItem("pulso:district", value);
  }
  return <LocationContext.Provider value={{ district, districts, loading, error, selectDistrict }}>{children}</LocationContext.Provider>;
}
export const useLocation = () => useContext(LocationContext);
