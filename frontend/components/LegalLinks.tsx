import Link from "next/link";

export function LegalLinks() {
  return (
    <footer className="legalLinks" aria-label="Información del servicio">
      <Link href="/informacion/privacidad">Privacidad</Link>
      <Link href="/informacion/cookies">Cookies y almacenamiento</Link>
      <Link href="/informacion/terminos">Condiciones de la demo</Link>
      <Link href="/informacion/cancelaciones">Cancelaciones y pagos</Link>
    </footer>
  );
}
