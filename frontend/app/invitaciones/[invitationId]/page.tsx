import { InvitationAcceptance } from "@/features/organizations/InvitationAcceptance";

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ invitationId: string }>;
}) {
  const { invitationId } = await params;
  return (
    <main className="section invitationPage">
      <p className="eyebrow">INVITACIÓN DE EQUIPO</p>
      <h1>Únete a un complejo deportivo</h1>
      <InvitationAcceptance invitationId={invitationId} />
    </main>
  );
}
