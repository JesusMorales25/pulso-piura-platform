"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDots,
  Compass,
  ForkKnife,
  Plus,
  UserCircle,
} from "@phosphor-icons/react";

export function AppNavigation() {
  const pathname = usePathname();
  const items = [
    {
      href: "/",
      label: "Explorar",
      Icon: Compass,
      active: pathname === "/" || pathname.startsWith("/partidos") || pathname === "/canchas",
    },
    {
      href: "/actividad",
      label: "Actividad",
      Icon: CalendarDots,
      active: pathname.startsWith("/actividad"),
    },
    {
      href: "/crear",
      label: "Crear",
      Icon: Plus,
      active: pathname.startsWith("/crear") || pathname.startsWith("/organizador"),
      featured: true,
    },
    {
      href: "/tercer-tiempo",
      label: "Tercer tiempo",
      Icon: ForkKnife,
      active: pathname.startsWith("/tercer-tiempo"),
    },
    {
      href: "/perfil",
      label: "Perfil",
      Icon: UserCircle,
      active:
        pathname.startsWith("/perfil") ||
        pathname.startsWith("/plataforma") ||
        pathname.startsWith("/organizaciones") ||
        pathname.startsWith("/admin/"),
    },
  ];

  return (
    <nav className="appNavigation" aria-label="Navegación principal">
      {items.map(({ href, label, Icon, active, featured }) => {
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={`${active ? "active" : ""} ${featured ? "featured" : ""}`.trim()}
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
