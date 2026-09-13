import { HomeDashboard } from "@/features/home/HomeDashboard";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; reserve?: string }>;
}) {
  const { mode, reserve } = await searchParams;
  const initialMode = mode === "venues" ? "venues" : "matches";
  const preparingDirectBooking = initialMode === "venues" && reserve === "1";
  return (
    <HomeDashboard
      initialMode={initialMode}
      key={`${initialMode}:${preparingDirectBooking}`}
      preparingDirectBooking={preparingDirectBooking}
    />
  );
}
