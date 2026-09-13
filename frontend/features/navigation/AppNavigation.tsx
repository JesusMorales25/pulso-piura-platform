"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDots,
  GearSix,
  House,
  PlusCircle,
} from "@phosphor-icons/react";
import { useUserCapabilities } from "@/features/access/useUserCapabilities";

export function AppNavigation() {
  const pathname = usePathname();
  const { capabilities } = useUserCapabilities();
  const contextualItems = capabilities.canManagePlatform
    ? [{ href: "/plataforma", label: "Plataforma", Icon: GearSix }]
    : [
        ...(capabilities.canOperateOrganizations
          ? [{ href: "/organizaciones", label: "Gestión", Icon: GearSix }]
          : []),
        ...(capabilities.canCreateMatches
          ? [{ href: "/organizador", label: "Organizar", Icon: PlusCircle }]
          : []),
      ];
  const items = [
    { href: "/", label: "Inicio", Icon: House },
    ...contextualItems,
    { href: "/actividad", label: "Actividad", Icon: CalendarDots },
  ];

  return (
    <nav className="appNavigation" aria-label="Navegación principal">
      {items.map(({ href, label, Icon }) => {
        const active =
          href === "/" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={active ? "active" : undefined}
            href={href}
            key={href}
          >
            <Icon
              aria-hidden="true"
              size={24}
              weight={active ? "fill" : "regular"}
            />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
