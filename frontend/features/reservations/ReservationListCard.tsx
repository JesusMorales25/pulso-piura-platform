"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarBlank,
  CaretRight,
  CheckCircle,
  Clock,
  MapPin,
} from "@phosphor-icons/react";
import { apiRequest } from "@/lib/api";
import {
  CourtPhotoImage,
  type CourtPhoto,
} from "@/features/venues/CourtPhotos";
import type { Reservation } from "./types";
import {
  reservationDate,
  reservationTime,
  reservationStatus,
} from "./presentation";
import styles from "./ReservationListCard.module.css";
export function ReservationListCard({
  reservation,
  selected,
  onSelect,
}: {
  reservation: Reservation;
  selected: boolean;
  onSelect: () => void;
}) {
  const [cover, setCover] = useState<{ space: string; id: string } | null>(
    null,
  );
  const space = reservation.sportSpaceId;
  useEffect(() => {
    const controller = new AbortController();
    void apiRequest<CourtPhoto[]>(`/public/spaces/${space}/photos`, null, {
      signal: controller.signal,
    })
      .then((photos) => {
        const photo = photos.find((item) => item.cover) ?? photos[0];
        if (!controller.signal.aborted)
          setCover(photo ? { space, id: photo.id } : null);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [space]);
  return (
    <button
      type="button"
      className={styles.card}
      aria-current={selected ? "true" : undefined}
      onClick={onSelect}
    >
      <span className={styles.photo} aria-hidden="true">
        {cover?.space === space ? (
          <CourtPhotoImage
            path={`/public/spaces/${space}/photos/${cover.id}/image`}
            alt=""
            className={styles.image}
          />
        ) : (
          <Image
            src="/images/demo-court-night.png"
            alt=""
            fill
            sizes="100px"
            className={styles.image}
          />
        )}
      </span>
      <span className={styles.content}>
        <strong>{reservation.spaceName ?? "Cancha"}</strong>
        <span className={styles.meta}>
          <MapPin aria-hidden="true" />
          <span>{reservation.venueName ?? "Complejo"}</span>
        </span>
        <span className={styles.meta}>
          <CalendarBlank aria-hidden="true" />
          <span>{reservationDate(reservation.startsAt)}</span>
        </span>
        <span className={styles.meta}>
          <Clock aria-hidden="true" />
          <span>
            {reservationTime(reservation.startsAt)} –{" "}
            {reservationTime(reservation.endsAt)}
          </span>
        </span>
        <span
          className={styles.action}
          data-confirmed={reservation.status === "CONFIRMED"}
        >
          <span>
            {reservation.status === "CONFIRMED" && (
              <CheckCircle weight="fill" aria-hidden="true" />
            )}
            {reservationStatus[reservation.status]}
          </span>
          <span>
            Ver reserva <ArrowRight aria-hidden="true" />
          </span>
        </span>
      </span>
      <CaretRight className={styles.chevron} aria-hidden="true" />
    </button>
  );
}
