"use client";

import { ReactNode, useEffect, useId, useRef } from "react";

/** Keep children mounted so closing the sheet preserves unfinished input. */
export function FormSheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const returnFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (open && !dialog.current?.open) {
      returnFocus.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      dialog.current?.showModal();
    }
    if (!open && dialog.current?.open) {
      dialog.current.close();
      returnFocus.current?.focus({ preventScroll: true });
    }
  }, [open]);
  return (
    <dialog
      ref={dialog}
      className="createComplexDialog resourceFormSheet"
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
      {children}
    </dialog>
  );
}
