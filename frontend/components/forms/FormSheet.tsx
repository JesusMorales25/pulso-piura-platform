"use client";

import { ReactNode, useEffect, useId, useRef } from "react";

/** Keep children mounted so closing the sheet preserves unfinished input. */
export function FormSheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);
  return <dialog ref={dialog} className="createComplexDialog resourceFormSheet" aria-labelledby={titleId} onCancel={onClose}>
    <header className="createComplexDialogHeading"><h2 id={titleId}>{title}</h2><button className="secondary" type="button" aria-label="Cerrar formulario" onClick={onClose}>×</button></header>
    {children}
  </dialog>;
}
