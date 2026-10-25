"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import {
  CourtPhotoImage,
  type CourtPhoto,
} from "@/features/venues/CourtPhotos";
export function ReservationCourtPhoto({
  spaceId,
  className,
}: {
  spaceId: string;
  className?: string;
}) {
  const [cover, setCover] = useState<{ space: string; id: string } | null>(
    null,
  );
  useEffect(() => {
    const controller = new AbortController();
    void apiRequest<CourtPhoto[]>(`/public/spaces/${spaceId}/photos`, null, {
      signal: controller.signal,
    })
      .then((photos) => {
        const photo = photos.find((item) => item.cover) ?? photos[0];
        if (!controller.signal.aborted)
          setCover(photo ? { space: spaceId, id: photo.id } : null);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [spaceId]);
  return cover?.space === spaceId ? (
    <CourtPhotoImage
      path={`/public/spaces/${spaceId}/photos/${cover.id}/image`}
      alt=""
      className={className}
    />
  ) : (
    <Image
      src="/images/demo-court-night.png"
      alt=""
      fill
      sizes="120px"
      className={className}
    />
  );
}
