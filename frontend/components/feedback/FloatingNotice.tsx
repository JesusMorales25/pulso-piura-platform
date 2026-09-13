"use client";

import { useEffect } from "react";
import {
  CheckCircle,
  Info,
  WarningCircle,
  X,
} from "@phosphor-icons/react";

type NoticeTone = "success" | "error" | "info";

type FloatingNoticeProps = {
  message: string;
  tone?: NoticeTone;
  onDismiss: () => void;
  duration?: number;
};

const iconByTone = {
  success: CheckCircle,
  error: WarningCircle,
  info: Info,
};

export function FloatingNotice({
  message,
  tone = "info",
  onDismiss,
  duration = 4500,
}: FloatingNoticeProps) {
  useEffect(() => {
    if (!message || duration <= 0) return;
    const timer = window.setTimeout(onDismiss, duration);
    return () => window.clearTimeout(timer);
  }, [duration, message, onDismiss]);

  if (!message) return null;

  const Icon = iconByTone[tone];
  const liveRole = tone === "error" ? "alert" : "status";

  return (
    <aside
      aria-atomic="true"
      className={`floatingNotice floatingNotice--${tone}`}
      role={liveRole}
    >
      <Icon aria-hidden="true" size={24} weight="fill" />
      <p>{message}</p>
      <button
        aria-label="Cerrar mensaje"
        onClick={onDismiss}
        type="button"
      >
        <X aria-hidden="true" size={18} weight="bold" />
      </button>
    </aside>
  );
}
