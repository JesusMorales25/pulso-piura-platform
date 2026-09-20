import { MatchInvitationAcceptance } from "@/features/matches/MatchInvitationAcceptance";

export default async function MatchInvitationPage({
  params,
}: {
  params: Promise<{ invitationId: string }>;
}) {
  const { invitationId } = await params;
  return (
    <main className="section invitationPage">
      <p className="eyebrow">INVITACIÓN PRIVADA</p>
      <h1>Confirma que jugarás</h1>
      <p className="pageLead">
        Al aceptar podrás ver los datos de la pichanga y reservar tu cupo.
      </p>
      <MatchInvitationAcceptance invitationId={invitationId} />
    </main>
  );
}
