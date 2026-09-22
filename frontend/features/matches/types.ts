export type MatchSummary = {
  id: string;
  publicSlug: string;
  sportSpaceId: string;
  spaceName: string;
  venueName: string;
  venueAddress: string;
  title: string;
  sportCode: string;
  formatCode: string;
  skillLevel: string;
  maxPlayers: number;
  minPlayers: number;
  occupiedPlayers: number;
  availablePlayers: number;
  organizerCounts: boolean;
  priceMinor: number;
  currency: string;
  visibility: "PUBLIC" | "LINK" | "PRIVATE";
  cancellationPolicy: string;
  startsAt: string;
  endsAt: string;
  status: "DRAFT" | "PUBLISHED" | "CANCELLED";
  managedByCurrentUser: boolean;
  participantPreview: Array<{ displayName: string; avatarUrl: string | null }>;
  organizerDisplayName: string | null;
  organizerAvatarUrl: string | null;
  surfaceName: string | null;
  amenityNames: string[];
};

export type MatchInvitation = {
  id: string;
  matchId: string;
  email: string;
  status: "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";
  expiresAt: string;
  acceptedAt: string | null;
};

export type MatchParticipation = {
  status: "JOINED" | "WAITLISTED" | "WITHDRAWN";
  waitlistPosition: number | null;
  occupiedPlayers: number;
  availablePlayers: number;
};

export type MatchJoinOrder = {
  id: string;
  matchId: string;
  amountMinor: number;
  currency: string;
  method: "YAPE" | "PLIN";
  status: "PENDING" | "PAID" | "EXPIRED";
  expiresAt: string;
  providerReference: string | null;
  paidAt: string | null;
  simulated: boolean;
};

export type MatchParticipantAdmin = {
  participantId: string;
  userId: string | null;
  source: "ACCOUNT" | "MANUAL";
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  status: "JOINED" | "WAITLISTED";
  paymentStatus: "PAID" | "PAID_DIRECT" | "PENDING" | "UNPAID" | "NOT_REQUIRED";
  paidMinor: number;
  paymentMethod: "YAPE" | "PLIN" | "DIRECTO" | null;
  paidAt: string | null;
  joinedAt: string | null;
  checkedInAt: string | null;
};
