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
              pathname.startsWith("/organizaciones") ||
              pathname.startsWith("/admin/"),
          }
        : {
            href: "/crear",
            label: "Crear",
            Icon: Plus,
            active:
              pathname.startsWith("/crear") ||
              pathname.startsWith("/organizador"),
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
      active:
        pathname === "/" ||
        pathname.startsWith("/partidos") ||
        pathname === "/canchas",
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

  const captions: Record<string, string> = {
    Explorar: "Partidos y canchas",
    Actividad: "Tus partidos y reservas",
    "Mis canchas": "Sedes, horarios y equipo",
    "Mi cancha": "Operación de tu complejo",
    Reservas: "Pagos y disponibilidad",
    Administrar: "Accesos y complejos",
    Crear: "Organiza tu próximo partido",
    "Tercer tiempo": "Planes después del partido",
    Perfil: "Tu cuenta y preferencias",
  };
  return (
    <nav className="appNavigation" aria-label="Navegación principal">
      <div className="appNavigationContext" aria-hidden="true">
        <span>Tu espacio</span>
        <strong>
          {capabilities.canManagePlatform
            ? "Administración"
            : capabilities.isVenueOwner
              ? "Gestiona tu complejo"
              : "Vive el juego"}
        </strong>
      </div>
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
            <span>
              {label}
              <small className="appNavigationCaption" aria-hidden="true">
                {captions[label]}
              </small>
            </span>
          </Link>
        );
      })}
      <div className="appNavigationFooter" aria-hidden="true">
        <strong>Pulso Piura</strong>
        <span>Nos vemos en la cancha.</span>
      </div>
    </nav>
  );
}
