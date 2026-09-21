import { ActivityDashboard } from "@/features/activity/ActivityDashboard";
export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ reservation?: string; from?: string }>;
}) {
  const { reservation, from } = await searchParams;
  return (
    <main className="section activityPage">
      <section className="activityPassHero">
        <div>
          <p className="eyebrow">TU JUEGO EN PIURA</p>
          <h1>Partidos, canchas y próximos encuentros</h1>
          <p>Consulta lo que viene y lleva contigo cada pase de llegada.</p>
        </div>
      </section>
      <ActivityDashboard
        highlightedReservationId={reservation ?? ""}
        returnToCreate={from === "create"}
      />
    </main>
  );
}
