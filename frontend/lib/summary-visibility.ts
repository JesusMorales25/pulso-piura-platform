export type SummaryValue = { value: string | number; numericValue?: number };

/** Use raw amounts for formatted money; unknown/loading values stay visible. */
export function hasSummaryValue(item: SummaryValue): boolean {
  if (item.numericValue !== undefined) return item.numericValue !== 0;
  if (typeof item.value === "number") return item.value !== 0;
  const text = item.value.trim();
  if (!text) return true;
  const value = Number(text.replace(",", "."));
  return !Number.isFinite(value) || value !== 0;
}
