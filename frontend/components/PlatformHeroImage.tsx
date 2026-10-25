"use client";
import Image, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";
import { apiAssetUrl, apiRequest } from "@/lib/api";
export const visualSlots = [
  "home-matches",
  "home-venues",
  "activity",
  "create",
  "complexes",
] as const;
export type VisualSlot = (typeof visualSlots)[number];
export const visualSlotLabels: Record<VisualSlot, string> = {
  "home-matches": "Explorar partidos",
  "home-venues": "Explorar canchas",
  activity: "Actividad y reservas",
  create: "Crear partidos",
  complexes: "Gestión de complejos",
};
export type VisualAsset = { slot: VisualSlot; imageUrl: string };
export function visualAssetPath(slot: VisualSlot) {
  return `/public/visual-assets/${slot}/image`;
}
export function PlatformHeroImage({
  slot,
  alt = "",
  src = "/images/demo-court-night.png",
  ...props
}: Omit<ImageProps, "src"> & { slot: VisualSlot; src?: ImageProps["src"] }) {
  const [uploaded, setUploaded] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void apiRequest<VisualAsset[]>("/public/visual-assets", null, {
      signal: controller.signal,
    })
      .then((items) => {
        if (!controller.signal.aborted) {
          setUploaded(items.some((item) => item.slot === slot));
          setFailed(false);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [slot]);
  return (
    <Image
      {...props}
      alt={alt}
      src={
        uploaded && !failed
          ? apiAssetUrl("/api/v1" + visualAssetPath(slot))
          : src
      }
      unoptimized={uploaded && !failed}
      onError={() => setFailed(true)}
    />
  );
}
