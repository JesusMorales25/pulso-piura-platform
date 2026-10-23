"use client";

import { useEffect } from "react";

/** Covers native sheets and existing modal panels without changing their layout. */
export function AccessibleDialogs() {
  useEffect(() => {
    let active: HTMLElement | null = null;
    let returnFocus: HTMLElement | null = null;
    let lastOutsideFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    let previousOverflow = "";
    const focusable = () =>
      active
        ? Array.from(
            active.querySelectorAll<HTMLElement>(
              'a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])',
            ),
          ).filter(
            (node) =>
              node.getClientRects().length && !node.closest("[hidden],[inert]"),
          )
        : [];
    const focusFirst = () => (focusable()[0] ?? active)?.focus();
    const sync = () => {
      const panels = Array.from(
        document.querySelectorAll<HTMLElement>(
          'dialog[open],[role="dialog"][aria-modal="true"]',
        ),
      ).filter((node) => node.getClientRects().length);
      const next = panels.at(-1) ?? null;
      if (next === active) return;
      if (!active && next) {
        returnFocus = lastOutsideFocus;
        previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
      }
      active = next;
      if (active) {
        if (!active.hasAttribute("tabindex")) active.tabIndex = -1;
        if (!active.contains(document.activeElement)) focusFirst();
      } else {
        document.body.style.overflow = previousOverflow;
        if (returnFocus?.isConnected) returnFocus.focus();
        returnFocus = null;
      }
    };
    const keydown = (event: KeyboardEvent) => {
      if (!active) return;
      if (event.key === "Escape" && active.tagName !== "DIALOG") {
        const close = active.querySelector<HTMLButtonElement>(
          'button[aria-label^="Cerrar"]',
        );
        if (close) {
          event.preventDefault();
          event.stopImmediatePropagation();
          close.click();
        }
      }
      if (event.key !== "Tab") return;
      const nodes = focusable();
      const first = nodes[0];
      const last = nodes.at(-1);
      if (!first) {
        event.preventDefault();
        active.focus();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === active)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const focusin = (event: FocusEvent) => {
      if (
        active &&
        event.target instanceof Node &&
        !active.contains(event.target)
      )
        focusFirst();
      if (
        !active &&
        event.target instanceof HTMLElement &&
        !event.target.closest('dialog,[role="dialog"]')
      )
        lastOutsideFocus = event.target;
    };
    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["open", "hidden", "aria-modal"],
    });
    document.addEventListener("keydown", keydown, true);
    document.addEventListener("focusin", focusin);
    sync();
    return () => {
      observer.disconnect();
      document.removeEventListener("keydown", keydown, true);
      document.removeEventListener("focusin", focusin);
      if (active) document.body.style.overflow = previousOverflow;
    };
  }, []);
  return null;
}
