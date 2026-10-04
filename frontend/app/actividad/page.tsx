import { ActivityDashboard } from "@/features/activity/ActivityDashboard";
export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ reservation?: string; from?: string }>;
}) {
  const { reservation, from } = await searchParams;
  return (
    <main className="homePage hybridHome activityPage">
      <ActivityDashboard
        highlightedReservationId={reservation ?? ""}
        returnToCreate={from === "create"}
      />
    </main>
  );
}
