import { MyReservations } from "@/features/reservations/MyReservations";
import { MyMatchParticipations } from "@/features/matches/MyMatchParticipations";
import { QrCode, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ reservation?: string }>;
}) {
  const { reservation } = await searchParams;
  return (
    <main className="section activityPage">
      <section className="activityPassHero">
        <span><QrCode aria-hidden="true" size={30} weight="duotone" /></span>
        <div>
          <p className="eyebrow">PASES DIGITALES</p>
          <h1>Mis partidos y turnos reservados</h1>
          <p>Encuentra tus cupos, pagos y códigos de llegada en un solo lugar.</p>
        </div>
        <small><ShieldCheck aria-hidden="true" weight="fill" /> Acceso ligado a tu cuenta</small>
      </section>
      {!reservation && <MyMatchParticipations />}
      <MyReservations highlightedReservationId={reservation ?? ""} />
    </main>
  );
}
