"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CalendarDots,
  CheckCircle,
  MapPin,
  UsersThree,
} from "@phosphor-icons/react";
import { useAuth } from "@/features/auth/AuthProvider";
import { apiRequest } from "@/lib/api";
import { MatchQrPass } from "./MatchQrPass";
import { ExternalPaymentPanel } from "@/features/payments/ExternalPaymentPanel";

type MatchActivity = {
  id: string;
  publicSlug: string;
  title: string;
  formatCode: string;
  spaceName: string;
  venueName: string;
  venueAddress: string;
  startsAt: string;
  endsAt: string;
  participationStatus: "JOINED" | "WAITLISTED" | "PENDING_REVIEW";
  paymentStatus:
    | "PAID"
    | "PENDING"
    | "UNPAID"
    | "NOT_REQUIRED"
    | "PENDING_REVIEW"
    | "NEEDS_RESOLUTION"
    | "REJECTED"
    | "CORRECTION_REQUIRED"
    | "CONFIRMED";
  paidMinor: number;
  currency: string;
  checkedInAt: string | null;
};
const paymentLabels: Record<MatchActivity["paymentStatus"], string> = {
  PAID: "Pagado",
  CONFIRMED: "Pago confirmado",
  NOT_REQUIRED: "Sin costo",
  PENDING: "Pago pendiente",
  UNPAID: "Pago pendiente",
  PENDING_REVIEW: "Comprobante pendiente de validación",
  NEEDS_RESOLUTION: "Pago por resolver: contacta al organizador",
  REJECTED: "Comprobante rechazado",
  CORRECTION_REQUIRED: "Corrige el comprobante",
};

export function MyMatchParticipations() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<MatchActivity[]>([]);
  const [loading, setLoading] = useState(Boolean(accessToken));
  const [error, setError] = useState("");
  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    void apiRequest<MatchActivity[]>("/matches/participations/me", accessToken)
      .then((result) => {
        if (active) setItems(result);
      })
      .catch((reason) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "No pudimos cargar tus partidos.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [accessToken]);
  if (!accessToken) return null;
  return (
    <section className="activityMatches" aria-labelledby="my-matches-title">
      <div className="activitySectionTitle">
        <div>
          <p className="eyebrow">MIS INSCRIPCIONES</p>
          <h2 id="my-matches-title">Partidos</h2>
        </div>
        <Link href="/partidos">Buscar partidos</Link>
      </div>
      {loading && <p className="notice">Cargando tus inscripciones…</p>}
      {error && (
        <p className="inlineAlert errorNotice" role="alert">
          {error}
        </p>
      )}
      {!loading && !items.length && (
        <div className="empty compactEmpty">
          <UsersThree size={34} />
          <h3>Aún no te has unido a un partido</h3>
          <p>Cuando envíes un pago o confirmes un cupo aparecerá aquí.</p>
        </div>
      )}
      <div className="activityMatchList">
        {items.map((item) => {
          const start = new Date(item.startsAt);
          return (
            <article className="activityMatchEntry" key={item.id}>
              <Link
                className="activityMatchCard"
                href={`/partidos/${item.publicSlug}`}
              >
                <div className="activityMatchDate">
                  <strong>
                    {start.toLocaleDateString("es-PE", { day: "2-digit" })}
                  </strong>
                  <span>
                    {start.toLocaleDateString("es-PE", { month: "short" })}
                  </span>
                </div>
                <div>
                  <h3>{item.title}</h3>
                  <p>
                    <MapPin size={15} />
                    {item.venueName} · {item.spaceName}
                  </p>
                  <p>
                    <CalendarDots size={15} />
                    {start.toLocaleString("es-PE", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <span className="activityMatchStatus">
                  <CheckCircle size={17} />
                  {item.checkedInAt
                    ? "Ingreso registrado"
                    : item.participationStatus === "JOINED"
                      ? "Confirmado"
                      : item.participationStatus === "PENDING_REVIEW"
                        ? "Solicitud en revisión"
                        : "En espera"}
                  <small>{paymentLabels[item.paymentStatus]}</small>
                </span>
              </Link>
              {[
                "PENDING_REVIEW",
                "NEEDS_RESOLUTION",
                "REJECTED",
                "CORRECTION_REQUIRED",
                "CONFIRMED",
              ].includes(item.paymentStatus) && (
                <ExternalPaymentPanel
                  accessToken={accessToken}
                  targetType="MATCH"
                  targetId={item.id}
                  allowUpload={false}
                />
              )}
              {item.participationStatus === "JOINED" && (
                <MatchQrPass
                  accessToken={accessToken}
                  checkedInAt={item.checkedInAt}
                  publicSlug={item.publicSlug}
                />
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
