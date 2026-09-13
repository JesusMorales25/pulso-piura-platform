import type { Reservation } from "./types";
export const reservationStatus: Record<Reservation["status"], string> = {
  HOLD: "Horario retenido",
  PENDING_PAYMENT: "Pendiente de pago",
  CONFIRMED: "Confirmada",
  COMPLETED: "Atención completada",
  CANCELLED: "Cancelada",
  EXPIRED: "Tiempo vencido",
};
export const money = (minor: number) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(
    minor / 100,
  );
export const reservationDate = (value: string) =>
  new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
export const reservationTime = (value: string) =>
  new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
export const canPlayerCancel = (reservation: Reservation, now: number) =>
  ["HOLD", "PENDING_PAYMENT", "CONFIRMED"].includes(reservation.status) &&
  now <= new Date(reservation.startsAt).getTime() - 7200000;
