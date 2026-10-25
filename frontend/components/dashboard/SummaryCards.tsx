"use client";
import type { ReactNode } from "react";
import { hasSummaryValue } from "@/lib/summary-visibility";
import { CaretRight } from "@phosphor-icons/react";
import styles from "./SummaryCards.module.css";

export type SummaryCard = {
  id: string;
  label: string;
  value: string | number;
  numericValue?: number;
  description?: string;
  icon?: ReactNode;
  tone?: "primary" | "confirmed" | "muted";
};

export function SummaryCards({
  items,
  selectedId,
  onSelect,
  variant = "default",
}: {
  items: SummaryCard[];
  variant?: "default" | "player";
  selectedId?: string | null;
  onSelect: (id: string) => void;
}) {
  const visibleItems = items.filter(hasSummaryValue);
  if (visibleItems.length === 0) return null;
  return (
    <div
      className={`${styles.grid} ${variant === "player" ? styles.player : ""}`}
      aria-label="Resumen por categoría"
    >
      {visibleItems.map((item) => (
        <button
          type="button"
          key={item.id}
          className={styles.card}
          data-tone={item.tone ?? "primary"}
          aria-haspopup="dialog"
          aria-pressed={selectedId === item.id}
          onClick={() => onSelect(item.id)}
        >
          {item.icon && (
            <span className={styles.icon} aria-hidden="true">
              {item.icon}
            </span>
          )}
          <span className={styles.label}>{item.label}</span>
          <strong>{item.value}</strong>
          <span className={styles.action}>
            Ver detalle{" "}
            {variant === "player" ? (
              <CaretRight size={16} aria-hidden="true" />
            ) : (
              <span aria-hidden="true">↗</span>
            )}
          </span>
          {item.description && (
            <span className={styles.description}>{item.description}</span>
          )}
        </button>
      ))}
    </div>
  );
}
