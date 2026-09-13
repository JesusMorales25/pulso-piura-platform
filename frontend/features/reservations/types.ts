export type Reservation = {
  id: string;
  venueName?: string | null;
  spaceName?: string | null;
  sportSpaceId: string;
  startsAt: string;
  endsAt: string;
  status:
    | "HOLD"
    | "PENDING_PAYMENT"
    | "CONFIRMED"
    | "COMPLETED"
    | "CANCELLED"
    | "EXPIRED";
  totalMinor: number;
  paidMinor: number;
  depositMinor: number;
  currency: string;
  expiresAt: string | null;
  version: number;
};

export type ReservationPage = {
  items: Reservation[];
  page: number;
  size: number;
  total: number;
};
