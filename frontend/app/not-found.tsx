import Link from "next/link";
import { ArrowLeft, Compass } from "@phosphor-icons/react/dist/ssr";

export default function NotFound() {
  return <main className="routeState"><Compass aria-hidden="true" size={58} /><p className="eyebrow">RUTA NO ENCONTRADA</p><h1>Esta página todavía no está disponible</h1><p>La navegación principal continúa funcionando. Puedes volver al inicio y seguir explorando.</p><Link className="primary" href="/"><ArrowLeft aria-hidden="true" size={18} /> Volver al inicio</Link></main>;
}
