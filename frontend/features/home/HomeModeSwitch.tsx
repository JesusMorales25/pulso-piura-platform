"use client";

import { CalendarCheck, UsersThree } from "@phosphor-icons/react";

export type HomeMode = "matches" | "venues";

export function HomeModeSwitch({
  mode,
  onChange,
}: {
  mode: HomeMode;
  onChange: (mode: HomeMode) => void;
}) {
  const options = [
    ["matches", "Encontrar partido", UsersThree],
    ["venues", "Reservar cancha", CalendarCheck],
  ] as const;

  return (
    <div
      className="homeModeSwitch"
      aria-label="¿Qué quieres hacer?"
      role="group"
    >
      {options.map(([value, label, Icon]) => (
        <button
          aria-pressed={mode === value}
          className={mode === value ? "active" : ""}
          key={value}
          onClick={() => onChange(value)}
          type="button"
        >
          <Icon aria-hidden="true" size={20} /> {label}
        </button>
      ))}
    </div>
  );
}
