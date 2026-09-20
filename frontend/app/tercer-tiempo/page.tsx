import { ThirdTimeSection } from "@/features/home/ThirdTimeSection";
import { MapPin, Ticket, UsersThree } from "@phosphor-icons/react/dist/ssr";

export default function ThirdTimePage() {
  return (
    <main className="section thirdTimePage">
      <section className="thirdTimeHero">
        <div>
          <p className="eyebrow">DESPUÉS DEL PARTIDO</p>
          <h1>El tercer tiempo también se juega</h1>
          <p>
            Encuentra choperías y restaurantes cerca de las canchas. Contacta
            directamente al local o abre su ubicación exacta en Google Maps.
          </p>
          <div className="thirdTimeHeroFacts">
            <span><MapPin aria-hidden="true" /> Ubicaciones verificables</span>
            <span><UsersThree aria-hidden="true" /> Planes para el equipo</span>
            <span><Ticket aria-hidden="true" /> Beneficios próximamente</span>
          </div>
        </div>
      </section>
      <ThirdTimeSection />
    </main>
  );
}
