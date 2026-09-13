import { OrganizationAdmin } from "@/features/organizations/OrganizationAdmin";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  return (
    <main className="section">
      <OrganizationAdmin organizationId={orgId} />
    </main>
  );
}
