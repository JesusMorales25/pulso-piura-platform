"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarCheck,
  CalendarDots,
  Buildings,
  Compass,
  ForkKnife,
  GearSix,
  Plus,
  UserCircle,
} from "@phosphor-icons/react";
import { useUserCapabilities } from "@/features/access/useUserCapabilities";

export function AppNavigation() {
  const pathname = usePathname();
  const { capabilities } = useUserCapabilities();
  const centralItem = capabilities.canManagePlatform
    ? {
        href: "/plataforma",
        label: "Administrar",
        Icon: GearSix,
        active: pathname.startsWith("/plataforma"),
      }
    : capabilities.isVenueOwner
      ? {
          href: "/reservas-cancha",
          label: "Reservas",
          Icon: CalendarCheck,
          active: pathname.startsWith("/reservas-cancha"),
        }
    : capabilities.canOperateOrganizations
      ? {
          href: "/organizaciones",
          label: "Mi cancha",
          Icon: Buildings,
          active:
            pathname.startsWith("/organizaciones") || pathname.startsWith("/admin/"),
        }
      : {
          href: "/crear",
          label: "Crear",
          Icon: Plus,
          active: pathname.startsWith("/crear") || pathname.startsWith("/organizador"),
        };
  const activityItem = capabilities.isVenueOwner
    ? {
        href: "/organizaciones",
        label: "Mis canchas",
        Icon: Buildings,
        active:
          pathname.startsWith("/organizaciones") ||
          pathname.startsWith("/admin/"),
        featured: false,
      }
    : {
        href: "/actividad",
        label: "Actividad",
        Icon: CalendarDots,
        active: pathname.startsWith("/actividad"),
        featured: false,
      };
  const items = [
    {
      href: "/",
      label: "Explorar",
      Icon: Compass,
      active: pathname === "/" || pathname.startsWith("/partidos") || pathname === "/canchas",
      featured: false,
    },
    activityItem,
    { ...centralItem, featured: true },
    {
      href: "/tercer-tiempo",
      label: "Tercer tiempo",
      Icon: ForkKnife,
      active: pathname.startsWith("/tercer-tiempo"),
      featured: false,
    },
    {
      href: "/perfil",
      label: "Perfil",
      Icon: UserCircle,
      active: pathname.startsWith("/perfil"),
      featured: false,
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
