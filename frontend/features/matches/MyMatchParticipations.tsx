"use client";

import Link from "next/link";
import styles from "./MyMatchParticipations.module.css";
import { useEffect, useState } from "react";
import {
  CalendarDots,
  CreditCard,
  Wallet,
  Clock,
  ClipboardText,
  SoccerBall,
  MagnifyingGlass,
  CheckCircle,
  MapPin,
  UsersThree,
} from "@phosphor-icons/react";
import { useAuth } from "@/features/auth/AuthProvider";
import { apiRequest } from "@/lib/api";
import { FormSheet } from "@/components/forms/FormSheet";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import drilldown from "@/features/reservations/ReservationDrilldown.module.css";
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
  const [category, setCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<MatchActivity | null>(null);
  const [revision, setRevision] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    const load = () =>
      apiRequest<MatchActivity[]>("/matches/participations/me", accessToken)
        .then((result) => {
          if (active) {
            setError("");
            setItems(result);
            setSelected((current) =>
              current
                ? (result.find((item) => item.id === current.id) ?? current)
                : null,
            );
          }
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
    void load();
    const timer = setInterval(() => void load(), 8000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [accessToken, revision]);
  if (!accessToken) return null;
  const groups = [
    {
      id: "review",
      label: "Por confirmar pago",
      match: (item: MatchActivity) => item.paymentStatus === "PENDING_REVIEW",
    },
    {
      id: "payment",
      label: "Pagos por atender",
      match: (item: MatchActivity) =>
        [
          "PENDING",
          "UNPAID",
          "REJECTED",
          "CORRECTION_REQUIRED",
          "NEEDS_RESOLUTION",
        ].includes(item.paymentStatus),
    },
    {
      id: "confirmed",
      label: "Confirmados",
      match: (item: MatchActivity) =>
        item.participationStatus === "JOINED" &&
        !item.checkedInAt &&
        Date.parse(item.endsAt) > now,
    },
    {
      id: "waiting",
      label: "En espera",
      match: (item: MatchActivity) => item.participationStatus === "WAITLISTED",
    },
    {
      id: "history",
      label: "Historial",
      match: (item: MatchActivity) =>
        !!item.checkedInAt || Date.parse(item.endsAt) <= now,
    },
    { id: "all", label: "Todos mis partidos", match: () => true },
  ];
  const categoryIcons = {
    review: CreditCard,
    payment: Wallet,
    confirmed: CheckCircle,
    waiting: Clock,
    history: ClipboardText,
    all: SoccerBall,
  };
  const group = groups.find((item) => item.id === category);
  const filtered = items.filter(group?.match ?? (() => true));
  return (
    <section
      className={`activityMatches ${styles.overview}`}
      aria-labelledby="my-matches-title"
    >
      <div className="activitySectionTitle">
        <div>
          <p className="eyebrow">MIS INSCRIPCIONES</p>
          <h2 id="my-matches-title">Partidos</h2>
        </div>
        <Link className={styles.search} href="/partidos">
          <MagnifyingGlass size={19} aria-hidden="true" />
          Buscar partidos
        </Link>
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
      {!loading && !error && items.length > 0 && (
        <SummaryCards
          variant="player"
          selectedId={category}
          onSelect={(id) => {
            setSelected(null);
            setCategory(id);
          }}
          items={groups.map((group) => ({
            id: group.id,
            label: group.label,
            icon: (() => {
              const Icon =
                categoryIcons[group.id as keyof typeof categoryIcons];
              return <Icon weight="duotone" />;
            })(),
            tone:
              group.id === "confirmed"
                ? "confirmed"
                : ["history", "waiting"].includes(group.id)
                  ? "muted"
                  : "primary",
            value: items.filter(group.match).length,
          }))}
        />
      )}
      <FormSheet
        variant="workspace"
        open={category !== null}
        title={selected ? "Tu inscripción" : (group?.label ?? "Mis partidos")}
        onClose={() => {
          setCategory(null);
          setRevision((value) => value + 1);
        }}
      >
        {selected ? (
          <button
            className="secondary"
            type="button"
            onClick={() => {
              setSelected(null);
              setRevision((value) => value + 1);
            }}
          >
            ← Volver a la lista
          </button>
        ) : (
          <div className={drilldown.list}>
            {filtered.length === 0 ? (
              <p className="empty">No hay partidos en esta categoría.</p>
            ) : (
              filtered.map((item) => (
                <button
                  className={drilldown.row}
                  type="button"
                  key={item.id}
                  onClick={() => setSelected(item)}
                >
                  <strong>{item.title}</strong>
                  <small>
                    {new Date(item.startsAt).toLocaleString("es-PE", {
                      timeZone: "America/Lima",
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </small>
                  <span>
                    {paymentLabels[item.paymentStatus]} · Ver inscripción →
                  </span>
                </button>
              ))
            )}
          </div>
        )}
        <div className="activityMatchList">
          {(selected ? [selected] : []).map((item) => {
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
                    onChange={() => setRevision((value) => value + 1)}
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
      </FormSheet>
    </section>
  );
}
