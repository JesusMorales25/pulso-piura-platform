import type { MatchParticipantAdmin } from "./types";

/** Payment counters and drill-down rows use the same confirmed, unique roster. */
export function organizerPaymentParticipants(
  roster: MatchParticipantAdmin[],
  statuses: readonly string[],
): MatchParticipantAdmin[] {
  const unique = new Map(
    roster.map((person) => [person.participantId, person]),
  );
  return [...unique.values()].filter(
    (person) =>
      person.status === "JOINED" && statuses.includes(person.paymentStatus),
  );
}

/** Receipts can precede joining a match, so never infer review work from the roster. */
export function organizerPendingProofs<
  T extends { id: string; status: string },
>(proofs: T[]): T[] {
  return [...new Map(proofs.map((proof) => [proof.id, proof])).values()].filter(
    (proof) => proof.status === "PENDING_REVIEW",
  );
}
