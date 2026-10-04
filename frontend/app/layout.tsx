import type { Metadata } from "next";
import Link from "next/link";
import { Pulse } from "@phosphor-icons/react/dist/ssr";
import { LocationProvider } from "@/features/navigation/LocationProvider";
import { LocationSelector } from "@/features/navigation/LocationSelector";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { AuthButton } from "@/features/auth/AuthButton";
import { AppNavigation } from "@/features/navigation/AppNavigation";
import "@fontsource-variable/manrope";
import "./styles.css";

export const metadata: Metadata = {
  title: "Pulso Piura",
  description: "Encuentra partidos y completa tu equipo en Piura.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html data-scroll-behavior="smooth" lang="es">
      <body suppressHydrationWarning>
        <AuthProvider>
          <LocationProvider>
          <header className="topbar">
            <Link className="brand" href="/">
              <Pulse aria-hidden="true" className="brandPulse" weight="bold" />
              <span className="brandWords">
                <strong>PULSO</strong>
                <small>PIURA</small>
              </span>
            </Link>
            <LocationSelector />
            <AuthButton />
          </header>
          {children}
          <AppNavigation />
          </LocationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
