import type { Reservation } from "./types";

export type ReservationPaymentPlan = "DEPOSIT" | "FULL";

export function reservationPaymentOptions(
  reservation: Pick<Reservation, "depositMinor" | "totalMinor">,
): Array<{ plan: ReservationPaymentPlan; amountMinor: number; label: string }> {
  return [
    { plan: "DEPOSIT", amountMinor: reservation.depositMinor, label: "Adelanto 20 %" },
    { plan: "FULL", amountMinor: reservation.totalMinor, label: "Pago completo" },
  ];
}
