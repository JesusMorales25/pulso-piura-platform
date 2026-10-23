"use client";
/* eslint-disable @next/next/no-img-element -- API assets and local blob previews. */
import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { apiAssetUrl } from "@/lib/api";
import { privateBusinessImageUrl } from "@/lib/business-image";

export function BusinessImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const { accessToken } = useAuth();
  const [preview, setPreview] = useState<{
    source: string;
    url: string;
  } | null>(null);
  const privateUrl = privateBusinessImageUrl(
    src,
    process.env.NEXT_PUBLIC_API_BASE_URL,
  );
  const protectedAsset = privateUrl !== null;
  useEffect(() => {
    if (!privateUrl || !accessToken) return;
    const controller = new AbortController();
    let objectUrl: string | null = null;
    void fetch(privateUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
      cache: "no-store",
      redirect: "error",
    })
      .then(async (response) => {
        if (!response.ok) return;
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setPreview({ source: src, url: objectUrl });
      })
      .catch(() => {});
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, accessToken, privateUrl]);
  const visible = protectedAsset
    ? preview?.source === src
      ? preview.url
      : null
    : apiAssetUrl(src);
  return visible ? (
    <img
      src={visible}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
    />
  ) : (
    <span role="status">Imagen no disponible</span>
  );
}
