"use client";
import styles from "./SummaryCards.module.css";

export type SummaryCard = {
  id: string;
  label: string;
  value: string | number;
  description?: string;
};

export function SummaryCards({
  items,
  selectedId,
  onSelect,
}: {
  items: SummaryCard[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className={styles.grid} aria-label="Resumen por categoría">
      {items.map((item) => (
        <button
          type="button"
          key={item.id}
          className={styles.card}
          aria-haspopup="dialog"
          aria-pressed={selectedId === item.id}
          onClick={() => onSelect(item.id)}
        >
          <span className={styles.label}>{item.label}</span>
          <strong>{item.value}</strong>
          <span className={styles.action}>
            Ver detalle <span aria-hidden="true">↗</span>
          </span>
          {item.description && (
            <span className={styles.description}>{item.description}</span>
          )}
        </button>
      ))}
    </div>
  );
}
