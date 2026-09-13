import { MatchDetail } from "@/features/matches/MatchDetail";

export default async function MatchPage({
  params,
}: {
  params: Promise<{ publicSlug: string }>;
}) {
  const { publicSlug } = await params;
  return <MatchDetail publicSlug={publicSlug} />;
}
