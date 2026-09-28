import type { MatchParticipantAdmin } from "./types";

export type MatchFinanceSummary = {
  confirmed: MatchParticipantAdmin[];
  paidOnline: MatchParticipantAdmin[];
  paidDirect: MatchParticipantAdmin[];
  pending: MatchParticipantAdmin[];
  onlineMinor: number;
  directMinor: number;
  collectedMinor: number;
  expectedMinor: number;
  pendingMinor: number;
};

export function summarizeMatchFinances(
  roster: MatchParticipantAdmin[],
  priceMinor: number,
): MatchFinanceSummary {
  const unique = new Map<string, MatchParticipantAdmin>();
  for (const participant of roster) {
    if (!unique.has(participant.participantId)) {
      unique.set(participant.participantId, participant);
    }
  }
  const confirmed = Array.from(unique.values()).filter(
    (participant) => participant.status === "JOINED",
  );
  const paidOnline = confirmed.filter(
    (participant) => participant.paymentStatus === "PAID",
  );
  const paidDirect = confirmed.filter(
    (participant) => participant.paymentStatus === "PAID_DIRECT",
  );
  const pending = confirmed.filter(
    (participant) =>
      !["PAID", "PAID_DIRECT", "NOT_REQUIRED"].includes(participant.paymentStatus),
  );
  const chargeable = confirmed.filter(
    (participant) => participant.paymentStatus !== "NOT_REQUIRED",
  );
  const onlineMinor = paidOnline.reduce(
    (total, participant) => total + participant.paidMinor,
    0,
  );
  const directMinor = paidDirect.reduce(
    (total, participant) => total + participant.paidMinor,
    0,
  );
  return {
    confirmed,
    paidOnline,
    paidDirect,
    pending,
    onlineMinor,
    directMinor,
    collectedMinor: onlineMinor + directMinor,
    expectedMinor: chargeable.length * priceMinor,
    pendingMinor: pending.length * priceMinor,
  };
}

export function isProtectedOrganizerRow(participant: MatchParticipantAdmin): boolean {
  return participant.source === "ORGANIZER";
}
