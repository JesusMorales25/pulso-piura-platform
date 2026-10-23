export function proofImageError(
  file: { size: number; type: string } | null,
): string | null {
  if (!file || file.size === 0) return "Selecciona una captura JPG o PNG.";
  if (file.size > 5 * 1024 * 1024)
    return "La captura debe pesar como máximo 5 MB.";
  if (file.type !== "image/png" && file.type !== "image/jpeg")
    return "Solo se admiten capturas JPG o PNG.";
  return null;
}

export function paymentPreparationActive(
  expiresAt: string | null | undefined,
  now: number,
): boolean {
  return !!expiresAt && new Date(expiresAt).getTime() > now;
}
