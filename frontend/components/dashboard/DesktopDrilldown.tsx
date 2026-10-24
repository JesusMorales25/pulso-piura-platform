"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./DesktopDrilldown.module.css";

export function DesktopDrilldown({
  list,
  detail,
  selected,
}: {
  list: ReactNode;
  detail: ReactNode;
  selected: boolean;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const lastListFocus = useRef<HTMLElement | null>(null);
  const previousSelected = useRef(selected);

  useEffect(() => {
    if (previousSelected.current === selected) return;
    previousSelected.current = selected;
    if (window.matchMedia("(min-width: 1280px)").matches) return;
    if (selected) {
      detailRef.current
        ?.querySelector<HTMLElement>(
          "[data-drilldown-back], button, a, input, select",
        )
        ?.focus();
    } else if (
      lastListFocus.current &&
      listRef.current?.contains(lastListFocus.current)
    ) {
      lastListFocus.current.focus();
    } else {
      listRef.current?.querySelector<HTMLElement>("select, button, a")?.focus();
    }
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    const media = window.matchMedia("(min-width: 1280px)");
    const keepVisibleFocus = () => {
      if (
        !media.matches &&
        !detailRef.current?.contains(document.activeElement)
      ) {
        detailRef.current
          ?.querySelector<HTMLElement>(
            "[data-drilldown-back], button, a, input, select",
          )
          ?.focus();
      } else if (
        media.matches &&
        document.activeElement?.hasAttribute("data-drilldown-back")
      ) {
        listRef.current
          ?.querySelector<HTMLElement>('[aria-current="true"]')
          ?.focus();
      }
    };
    media.addEventListener("change", keepVisibleFocus);
    return () => media.removeEventListener("change", keepVisibleFocus);
  }, [selected]);

  return (
    <div
      className={styles.workspace}
      data-selected={selected}
      data-desktop-drilldown
    >
      <div
        ref={listRef}
        className={styles.list}
        data-drilldown-list
        onFocusCapture={(event) => {
          lastListFocus.current = event.target as HTMLElement;
        }}
      >
        {list}
      </div>
      <div ref={detailRef} className={styles.detail} data-drilldown-detail>
        {selected ? (
          detail
        ) : (
          <div className={styles.placeholder}>
            <h3>Selecciona una reserva</h3>
            <p>Consulta el horario, los pagos y las acciones disponibles.</p>
          </div>
        )}
      </div>
    </div>
  );
}
