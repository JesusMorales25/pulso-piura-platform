"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { apiRequest } from "@/lib/api";
import { HomeModeSwitch, HomeMode } from "@/features/home/HomeModeSwitch";
import { MatchDiscoveryPanel } from "@/features/home/MatchDiscoveryPanel";
import { ThirdTimeSection } from "@/features/home/ThirdTimeSection";
import { HomeVenuePreview } from "@/features/home/HomeVenuePreview";
import { PublicVenueCatalog } from "@/features/venues/PublicVenueCatalog";

export type HomeVenue = {
  publicSlug: string;
  name: string;
  address: string;
  districtCode: string;
};

type VenuePage = { items: HomeVenue[] };
type Me = { displayName: string };

const heroSlides: Record<HomeMode, string[]> = {
  matches: [
    "/images/hero-football-night.png",
    "/images/hero-match-football-mixed-night.png",
    "/images/hero-match-volleyball-night.png",
  ],
  venues: [
    "/images/venue-football-7.png",
    "/images/venue-volleyball.png",
    "/images/hero-venue-padel-night.png",
  ],
};

export function HomeDashboard({
  initialMode = "matches",
  preparingDirectBooking = false,
  returnToCreate = false,
}: {
  initialMode?: HomeMode;
  preparingDirectBooking?: boolean;
  returnToCreate?: boolean;
}) {
  const { accessToken } = useAuth();
  const [mode, setMode] = useState<HomeMode>(initialMode);
  const [name, setName] = useState("");
  const [heroIndex, setHeroIndex] = useState(0);
  const [venues, setVenues] = useState<HomeVenue[]>([]);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const slides = heroSlides[mode];

  useEffect(() => {
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Lima",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    void apiRequest<VenuePage>(`/venues?size=4&date=${today}`)
      .then((result) => setVenues(result.items))
      .catch(() => setVenues([]))
      .finally(() => setLoadingVenues(false));
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    void apiRequest<Me>("/me", accessToken)
      .then((me) => setName(me.displayName.split(" ")[0] ?? ""))
      .catch(() => setName(""));
  }, [accessToken]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const timer = window.setInterval(() => {
      setHeroIndex((current) => (current + 1) % slides.length);
    }, 5500);

    return () => window.clearInterval(timer);
  }, [mode, slides.length]);

  function selectMode(nextMode: HomeMode) {
    if (nextMode === mode) return;
    setHeroIndex(0);
    setMode(nextMode);
    window.history.replaceState(
      null,
      "",
      nextMode === "venues" ? "/?mode=venues" : "/?mode=matches",
    );
  }

  if (preparingDirectBooking && mode === "venues") {
    return (
      <main className="homePage hybridHome mode-venues directBookingPage">
        <div className="hybridContent">
          <PublicVenueCatalog embedded preparingDirectBooking returnToCreate={returnToCreate} />
        </div>
      </main>
    );
  }

  return (
    <main className={`homePage hybridHome mode-${mode}`}>
      <section className="hybridHero">
        <div aria-hidden="true" className="hybridHeroCarousel">
          {Object.values(heroSlides)
            .flat()
            .map((slide) => (
              <Image
                alt=""
                className={`hybridHeroImage ${slide === slides[heroIndex] ? "active" : ""}`}
                fill
                key={slide}
                priority={slide === heroSlides[initialMode][0]}
                sizes="(max-width: 760px) 100vw, 1120px"
                src={slide}
              />
            ))}
        </div>
        <div className="hybridHeroShade" />
        <div className="hybridHeroContent">
          <p
            aria-hidden={mode === "venues"}
            className={`prototypeGreeting ${mode === "venues" ? "heroGreetingPlaceholder" : ""}`}
          >
            {mode === "matches" ? `¡Hola${name ? `, ${name}` : ""}!` : "¡Hola!"}
          </p>
          <h1>
            <span className="heroTitleOption" aria-hidden={mode !== "matches"}>
              ¿Qué quieres jugar hoy?
            </span>
            <span className="heroTitleOption" aria-hidden={mode !== "venues"}>
              Tu próxima jugada <em>empieza aquí</em>
            </span>
          </h1>
          <HomeModeSwitch mode={mode} onChange={selectMode} />
        </div>
      </section>

      <div className="hybridContent">
        {mode === "matches" ? (
          <>
            <MatchDiscoveryPanel />
            <HomeVenuePreview loading={loadingVenues} venues={venues} />
          </>
        ) : (
          <PublicVenueCatalog embedded returnToCreate={returnToCreate} />
        )}
        {mode === "matches" && <ThirdTimeSection />}
      </div>
    </main>
  );
}
