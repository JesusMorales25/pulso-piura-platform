import { redirect } from "next/navigation";

export default async function VenuesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const current = await searchParams;
  const destination = new URLSearchParams({ mode: "venues" });
  Object.entries(current).forEach(([key, value]) => {
    if (key === "mode" || value === undefined) return;
    if (Array.isArray(value)) {
      value.forEach((item) => destination.append(key, item));
    } else {
      destination.set(key, value);
    }
  });
  redirect(`/?${destination}`);
}
