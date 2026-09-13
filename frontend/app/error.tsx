"use client";

import { ArrowClockwise, WarningCircle } from "@phosphor-icons/react";

export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <main className="routeState"><WarningCircle aria-hidden="true" size={58} /><p className="eyebrow">ALGO NO SALIÓ BIEN</p><h1>No pudimos cargar esta pantalla</h1><p>El resto de la aplicación sigue disponible. Reintenta sin perder la navegación.</p><button className="primary" onClick={retry} type="button"><ArrowClockwise aria-hidden="true" size={18} /> Reintentar</button></main>;
}
