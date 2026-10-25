"use client";

import { ReactNode, useEffect, useId, useRef } from "react";

/** Keep children mounted so closing the sheet preserves unfinished input. */
export function FormSheet({
  open,
  title,
  onClose,
  children,
  variant = "default",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  variant?: "default" | "workspace";
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const returnFocus = useRef<HTMLElement | null>(null);
  const returnScope = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (open && !dialog.current?.open) {
      returnFocus.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      returnScope.current = returnFocus.current?.closest("main") ?? null;
      dialog.current?.showModal();
      if (dialog.current) dialog.current.scrollTop = 0;
    }
    if (!open && dialog.current?.open) {
      dialog.current.close();
      if (returnFocus.current?.isConnected)
        returnFocus.current.focus({ preventScroll: true });
      else {
        const fallback = Array.from(
          returnScope.current?.querySelectorAll<HTMLElement>(
            "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled])",
          ) ?? [],
        ).find(
          (element) =>
            element.isConnected &&
            element.getClientRects().length > 0 &&
            !element.closest("dialog:not([open])"),
        );
        fallback?.focus({ preventScroll: true });
      }
    }
  }, [open]);
  return (
    <dialog
      ref={dialog}
      className={`createComplexDialog resourceFormSheet${variant === "workspace" ? " resourceFormSheet--workspace" : ""}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
    >
      <header className="createComplexDialogHeading">
        <h2 id={titleId}>{title}</h2>
        <button
          className="secondary"
          type="button"
          aria-label="Cerrar formulario"
          onClick={onClose}
        >
          ×
        </button>
      </header>
      <div className="resourceFormSheetBody">{children}</div>
    </dialog>
  );
}
