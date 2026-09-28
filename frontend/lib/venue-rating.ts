export type AdminRatingInput = {
  adminRating: number | null;
  adminRatingCount: number | null;
};

export function normalizeAdminRatingInput(
  ratingInput: string,
  countInput: string,
): AdminRatingInput {
  const ratingText = ratingInput.trim();
  const countText = countInput.trim();

  if (!ratingText && !countText) {
    return { adminRating: null, adminRatingCount: null };
  }
  if (!ratingText || !countText) {
    throw new Error("La calificación y la cantidad de valoraciones deben completarse juntas.");
  }

  const adminRating = Number(ratingText);
  const adminRatingCount = Number(countText);
  if (!Number.isFinite(adminRating) || adminRating < 0 || adminRating > 5) {
    throw new Error("La calificación debe estar entre 0 y 5.");
  }
  if (!Number.isInteger(adminRatingCount) || adminRatingCount < 0) {
    throw new Error("La cantidad de valoraciones debe ser un entero positivo o cero.");
  }

  return { adminRating, adminRatingCount };
}
