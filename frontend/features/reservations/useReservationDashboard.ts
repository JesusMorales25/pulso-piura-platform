"use client";
import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
export type ReservationFilter =
  | "ALL"
  | "CONFIRMED"
  | "PENDING_PAYMENT"
  | "PENDING_PAYMENT_CONFIRMATION"
  | "CANCELLED"
  | "COMPLETED"
  | "EXPIRED"
  | "PAID"
  | "BALANCE";
export const reservationFilterLabels: Record<ReservationFilter, string> = {
  ALL: "Todas las reservas",
  CONFIRMED: "Confirmadas",
  PENDING_PAYMENT: "Pendientes de pago",
  PENDING_PAYMENT_CONFIRMATION: "Por confirmar pago",
  CANCELLED: "Canceladas",
  COMPLETED: "Finalizadas",
  EXPIRED: "Vencidas",
  PAID: "Pagos registrados",
  BALANCE: "Saldo pendiente",
};
export type ReservationDashboard<T> = {
  counts: {
    all: number;
    confirmed: number;
    pendingPayment: number;
    pendingConfirmation: number;
    cancelled: number;
    completed: number;
    expired: number;
    paid: number;
    balance: number;
  };
  paidMinor: number;
  balanceMinor: number;
  retainedMinor: number;
  items: T[];
  total: number;
  page: number;
  size: number;
};
export function useReservationDashboard<T>(accessToken: string, path: string) {
  const [data, setData] = useState<ReservationDashboard<T> | null>(null);
  const [filter, setFilter] = useState<ReservationFilter | null>(null);
  const [page, setPageState] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const select = useCallback((value: ReservationFilter | null) => {
    setLoading(true);
    setPageState(0);
    setFilter(value);
    setError("");
  }, []);
  const setPage = useCallback((value: number) => {
    setLoading(true);
    setPageState(value);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function load() {
      try {
        const params = new URLSearchParams({ page: String(page), size: "10" });
        if (filter) params.set("filter", filter);
        const result = await apiRequest<ReservationDashboard<T>>(
          `${path}?${params}`,
          accessToken,
          { signal: controller.signal },
        );
        if (!controller.signal.aborted) {
          setData(result);
          setError("");
          setLoading(false);
        }
      } catch (reason) {
        if (!controller.signal.aborted) {
          setError(
            reason instanceof Error
              ? reason.message
              : "No se pudieron cargar las reservas.",
          );
          setLoading(false);
        }
      } finally {
        if (!controller.signal.aborted)
          timer = setTimeout(() => void load(), 8000);
      }
    }
    void load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [accessToken, path, filter, page, revision]);
  return { data, filter, page, loading, error, select, setPage, refresh };
}
