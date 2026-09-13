import { MyReservations } from "@/features/reservations/MyReservations";
import { MyMatchParticipations } from "@/features/matches/MyMatchParticipations";
export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ reservation?: string }>;
}) {
  const { reservation } = await searchParams;
  return (
    <main className="section">
      <p className="eyebrow">TU ACTIVIDAD</p>
      <h1>Partidos y reservas</h1>
      <MyMatchParticipations />
      <MyReservations highlightedReservationId={reservation ?? ""} />
    </main>
  );
}
