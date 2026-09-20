"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarBlank,
  Clock,
  FadersHorizontal,
  MapPin,
  MagnifyingGlass,
  SoccerBall,
  Star,
  UsersThree,
  WhatsappLogo,
  X,
} from "@phosphor-icons/react";
import { CardSkeletons } from "@/features/feedback/CardSkeletons";
import { apiRequest } from "@/lib/api";
import { googleMapsUrl, whatsappUrl } from "@/lib/public-links";
import { useAuth } from "@/features/auth/AuthProvider";
import { ReservationCheckout } from "@/features/reservations/ReservationCheckout";
import type { Reservation } from "@/features/reservations/types";

type CatalogItem = { code: string; name: string };
type VenueCatalog = {
  sports: CatalogItem[];
  amenities: (CatalogItem & { scope: string })[];
};
type Venue = {
  publicSlug: string;
  name: string;
  address: string;
  districtCode: string;
  publicPhone: string | null;
  latitude: number | null;
  longitude: number | null;
  amenityCodes: string[];
};
type VenuePage = { items: Venue[]; page: number; size: number; total: number };
type Space = {
  id: string;
  name: string;
  sportCode: string;
  formatCode: string;
  capacity: number;
  surfaceType: string | null;
  indoor: boolean;
  amenityCodes: string[];
};
type Slot = {
  startsAt: string;
  endsAt: string;
  priceMinor: number;
  currency: string;
};
type Availability = {
  sportSpaceId: string;
  timezone: string;
  date: string;
  slots: Slot[];
};
type VenueOffer = {
  venue: Venue;
  space: Space;
  availability: Availability;
  slot: Slot;
};

const localDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const hasExpired = (value: string) => Date.parse(value) <= Date.now();

const venueImages = [
  "/images/venue-football-7.png",
  "/images/venue-volleyball.png",
];

type DiscoveryMode = "all" | "venues" | "matches";

export function PublicVenueCatalog({
  embedded = false,
  preparingDirectBooking = false,
}: {
  embedded?: boolean;
  preparingDirectBooking?: boolean;
}) {
  const router = useRouter();
  const { accessToken, loading: authLoading, login } = useAuth();
  const [catalog, setCatalog] = useState<VenueCatalog>({
    sports: [],
    amenities: [],
  });
  const [venues, setVenues] = useState<Venue[]>([]);
  const [district, setDistrict] = useState("");
  const [sport, setSport] = useState("");
  const [date, setDate] = useState(localDate);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const [rawAvailability, setAvailability] = useState<Availability | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<Slot[]>([]);
  const [venueOffers, setVenueOffers] = useState<Record<string, VenueOffer>>(
    {},
  );
  const [offersLoading, setOffersLoading] = useState(false);
  const availability =
    rawAvailability?.sportSpaceId === selectedSpace?.id &&
    rawAvailability?.date === date
      ? rawAvailability
      : null;
  const bookingInFlight = useRef(false);
  const checkoutRef = useRef<HTMLElement | null>(null);
  const schedulesDialogRef = useRef<HTMLDivElement | null>(null);
  const bookingKeys = useRef(new Map<string, string>());
  const venueRequest = useRef(0);
  const offersRequest = useRef(0);
  const [bookingNames, setBookingNames] = useState({
    venueName: "",
    spaceName: "",
  });
  const [reservationBusy, setReservationBusy] = useState(false);
  const [preparingCheckout, setPreparingCheckout] = useState(
    preparingDirectBooking,
  );
  const [showFilters, setShowFilters] = useState(false);
  const [showOtherSchedules, setShowOtherSchedules] = useState(false);
  const [discoveryMode, setDiscoveryMode] = useState<DiscoveryMode>(
    embedded ? "venues" : "all",
  );

  const names = useMemo(
    () =>
      new Map(
        [...catalog.sports, ...catalog.amenities].map((item) => [
          item.code,
          item.name,
        ]),
      ),
    [catalog],
  );

  const loadVenueOffers = async (
    availableVenues: Venue[],
    dateValue: string,
  ) => {
    const request = ++offersRequest.current;
    setOffersLoading(true);
    setVenueOffers({});
    const entries = await Promise.all(
      availableVenues.map(async (venue) => {
        try {
          const venueSpaces = await apiRequest<Space[]>(
            `/venues/${venue.publicSlug}/spaces`,
          );
          const candidates = (
            await Promise.all(
              venueSpaces.map(async (space) => {
                try {
                  const spaceAvailability = await apiRequest<Availability>(
                    `/spaces/${space.id}/bookable-slots?date=${dateValue}`,
                  );
                  const slot = spaceAvailability.slots[0];
                  return slot
                    ? { venue, space, availability: spaceAvailability, slot }
                    : null;
                } catch {
                  return null;
                }
              }),
            )
          )
            .filter((offer): offer is VenueOffer => offer !== null)
            .sort((left, right) =>
              left.slot.startsAt.localeCompare(right.slot.startsAt),
            );
          return candidates[0]
            ? ([venue.publicSlug, candidates[0]] as const)
            : null;
        } catch {
          return null;
        }
      }),
    );
    if (request === offersRequest.current) {
      setVenueOffers(
        Object.fromEntries(
          entries.filter(
            (entry): entry is readonly [string, VenueOffer] => entry !== null,
          ),
        ),
      );
      setOffersLoading(false);
    }
  };

  async function loadVenuesForDate(dateValue: string, sportValue = sport) {
    venueRequest.current += 1;
    setLoading(true);
    setError("");
    setSelectedVenue(null);
    setSelectedSpace(null);
    setAvailability(null);
    setReservation(null);
    setSelectedSlots([]);
    const query = new URLSearchParams({ size: "20" });
    const searchTerm = district.trim().toLocaleLowerCase("es-PE");
    const sportFromSearch = searchTerm
      ? catalog.sports.find((item) =>
          item.name.toLocaleLowerCase("es-PE").includes(searchTerm),
        )?.code
      : undefined;
    if (sportValue || sportFromSearch)
      query.set("sport", sportValue || sportFromSearch!);
    query.set("date", dateValue);
    try {
      const result = await apiRequest<VenuePage>(`/venues?${query}`);
      const filteredVenues =
        searchTerm && !sportFromSearch
          ? result.items.filter((venue) =>
              [venue.name, venue.address, venue.districtCode].some((value) =>
                value.toLocaleLowerCase("es-PE").includes(searchTerm),
              ),
            )
          : result.items;
      setVenues(filteredVenues);
      void loadVenueOffers(filteredVenues, dateValue);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No se pudo cargar el catálogo.",
      );
    } finally {
      setLoading(false);
    }
  }

  function search(event?: FormEvent) {
    event?.preventDefault();
    void loadVenuesForDate(date);
  }

  function selectDate(nextDate: string) {
    if (nextDate === date) return;
    setDate(nextDate);
    void loadVenuesForDate(nextDate);
  }

  function selectSport(nextSport: string) {
    setSport(nextSport);
    void loadVenuesForDate(date, nextSport);
  }

  useEffect(() => {
    if (authLoading) return;
    async function start() {
      try {
        const requestedParams = new URLSearchParams(window.location.search);
        const requestedDistrict = requestedParams.get("district")?.trim() ?? "";
        const requestedDate = requestedParams.get("date")?.trim() ?? "";
        const requestedVenue = requestedParams.get("venue")?.trim() ?? "";
        const requestedSpace = requestedParams.get("space")?.trim() ?? "";
        const requestedStart = requestedParams.get("startsAt")?.trim() ?? "";
        const requestedEnd = requestedParams.get("endsAt")?.trim() ?? "";
        const reserveRequested = requestedParams.get("reserve") === "1";
        if (requestedDistrict) setDistrict(requestedDistrict);
        if (
          /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) &&
          requestedDate >= localDate()
        ) {
          setDate(requestedDate);
        }
        const result = await apiRequest<VenueCatalog>("/venue-catalogs");
        setCatalog(result);
        const initialQuery = new URLSearchParams({
          size: "20",
          date:
            /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) &&
            requestedDate >= localDate()
              ? requestedDate
              : localDate(),
        });
        if (requestedDistrict) initialQuery.set("district", requestedDistrict);
        const venuesResult = await apiRequest<VenuePage>(
          `/venues?${initialQuery}`,
        );
        setVenues(venuesResult.items);
        void loadVenueOffers(venuesResult.items, initialQuery.get("date")!);
        if (requestedVenue) {
          setShowOtherSchedules(true);
          let firstVenue = venuesResult.items.find(
            (venue) => venue.publicSlug === requestedVenue,
          );
          if (!firstVenue && requestedVenue) {
            firstVenue = await apiRequest<Venue>(
              `/venues/${requestedVenue}`,
            ).catch(() => undefined);
          }
          if (!firstVenue) {
            setPreparingCheckout(false);
            setError("El complejo seleccionado ya no está disponible.");
            return;
          }
          setSelectedVenue(firstVenue);
          const initialSpaces = await apiRequest<Space[]>(
            `/venues/${firstVenue.publicSlug}/spaces`,
          );
          setSpaces(initialSpaces);
          const initialSpace =
            initialSpaces.find((space) => space.id === requestedSpace) ??
            initialSpaces[0];
          if (initialSpace) {
            setSelectedSpace(initialSpace);
            const initialAvailability = await apiRequest<Availability>(
              `/spaces/${initialSpace.id}/bookable-slots?date=${initialQuery.get("date")}`,
            );
            setAvailability(initialAvailability);
            if (reserveRequested) {
              const requestedSlot = initialAvailability.slots.find(
                (slot) =>
                  slot.startsAt === requestedStart &&
                  slot.endsAt === requestedEnd,
              );
              if (requestedSlot) {
                setSelectedSlots([requestedSlot]);
                await createCheckout(
                  firstVenue,
                  initialSpace,
                  initialAvailability,
                  [requestedSlot],
                );
              } else {
                setPreparingCheckout(false);
                setError(
                  "Ese horario acaba de dejar de estar disponible. Elige otro horario.",
                );
              }
            } else if (preparingDirectBooking) {
              setPreparingCheckout(false);
            }
          } else if (preparingDirectBooking) {
            setPreparingCheckout(false);
            setError("El complejo no tiene canchas disponibles para reservar.");
          }
        }
      } catch (reason) {
        setPreparingCheckout(false);
        setError(
          reason instanceof Error
            ? reason.message
            : "No se pudo cargar el catálogo.",
        );
      } finally {
        setLoading(false);
      }
    }
    void start();
    // La selección se consume una vez, después de recuperar la sesión local.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  useEffect(() => {
    const controller = new AbortController();
    let timer: number;
    async function refresh() {
      if (!selectedSpace) return;
      try {
        const result = await apiRequest<Availability>(
          `/spaces/${selectedSpace.id}/bookable-slots?date=${date}`,
          null,
          { signal: controller.signal },
        );
        if (!controller.signal.aborted) {
          setAvailability(result);
          setSelectedSlots((current) =>
            current.filter((slot) =>
              result.slots.some(
                (item) =>
                  item.startsAt === slot.startsAt &&
                  item.endsAt === slot.endsAt,
              ),
            ),
          );
        }
      } catch (reason) {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "No se pudo actualizar la disponibilidad.",
          );
      } finally {
        if (!controller.signal.aborted) {
          setDetailLoading(false);
          timer = window.setTimeout(() => void refresh(), 15000);
        }
      }
    }
    void refresh();
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [date, selectedSpace, reservation?.status]);

  async function openVenue(venue: Venue) {
    const request = ++venueRequest.current;
    setShowOtherSchedules(true);
    setSelectedVenue(venue);
    setSelectedSpace(null);
    setAvailability(null);
    setReservation(null);
    setSelectedSlots([]);
    setDetailLoading(true);
    setError("");
    try {
      const venueSpaces = await apiRequest<Space[]>(
        `/venues/${venue.publicSlug}/spaces`,
      );
      if (request !== venueRequest.current) return;
      const availabilities = (
        await Promise.all(
          venueSpaces.map(async (space) => {
            try {
              return {
                space,
                availability: await apiRequest<Availability>(
                  `/spaces/${space.id}/bookable-slots?date=${date}`,
                ),
              };
            } catch {
              return null;
            }
          }),
        )
      ).filter(
        (
          entry,
        ): entry is {
          space: Space;
          availability: Availability;
        } => entry !== null,
      );
      if (request !== venueRequest.current) return;
      setSpaces(venueSpaces);
      const nextAvailable = availabilities
        .filter((entry) => entry.availability.slots.length > 0)
        .sort((left, right) =>
          left.availability.slots[0].startsAt.localeCompare(
            right.availability.slots[0].startsAt,
          ),
        )[0];
      const initial = nextAvailable ?? availabilities[0];
      if (initial) {
        setSelectedSpace(initial.space);
        setAvailability(initial.availability);
      } else if (venueSpaces[0]) {
        setSelectedSpace(venueSpaces[0]);
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No se pudieron cargar las canchas.",
      );
    } finally {
      setDetailLoading(false);
    }
  }

  function showVenueSchedules(venue: Venue) {
    const query = new URLSearchParams(window.location.search);
    query.set("mode", "venues");
    query.set("date", date);
    query.set("venue", venue.publicSlug);
    window.history.replaceState(null, "", `/?${query}#venue-schedules`);
    void openVenue(venue);
  }

  function closeVenueSchedules() {
    setShowOtherSchedules(false);
    setSelectedSlots([]);
    const query = new URLSearchParams(window.location.search);
    query.delete("venue");
    const suffix = query.size > 0 ? `?${query}` : "/";
    window.history.replaceState(null, "", suffix);
  }

  async function openSpace(space: Space) {
    setAvailability(null);
    setSelectedSpace(space);
    setSelectedSlots([]);
    setError("");
  }

  function toggleSlot(slot: Slot) {
    setReservation(null);
    setError("");
    setSelectedSlots((current) => {
      const exists = current.some((item) => item.startsAt === slot.startsAt);
      const next = exists
        ? current.filter((item) => item.startsAt !== slot.startsAt)
        : [...current, slot];
      const ordered = [...next].sort((left, right) =>
        left.startsAt.localeCompare(right.startsAt),
      );
      const consecutive = ordered.every(
        (item, index) =>
          index === 0 || ordered[index - 1].endsAt === item.startsAt,
      );
      if (!consecutive) {
        setError("Selecciona horarios consecutivos para una misma reserva.");
        return [slot];
      }
      return ordered;
    });
  }

  async function createCheckout(
    venue: Venue,
    space: Space,
    availabilityForBooking: Availability,
    slots: Slot[],
  ) {
    const first = slots[0];
    const last = slots.at(-1);
    if (
      bookingInFlight.current ||
      !first ||
      !last ||
      !slots.every((slot) =>
        availabilityForBooking.slots.some(
          (item) =>
            item.startsAt === slot.startsAt && item.endsAt === slot.endsAt,
        ),
      )
    )
      return;
    setPreparingCheckout(true);
    router.prefetch("/actividad");
    if (!accessToken) {
      const returnQuery = new URLSearchParams({
        date: availabilityForBooking.date,
        venue: venue.publicSlug,
        space: space.id,
        startsAt: first.startsAt,
        endsAt: last.endsAt,
        reserve: "1",
      });
      returnQuery.set("mode", "venues");
      await login(false, `/?${returnQuery}`);
      setPreparingCheckout(false);
      return;
    }
    bookingInFlight.current = true;
    const selection = `${accessToken}:${space.id}:${first.startsAt}:${last.endsAt}`;
    if (
      reservation &&
      (reservation.status === "CANCELLED" ||
        reservation.status === "EXPIRED" ||
        (reservation.expiresAt && hasExpired(reservation.expiresAt)))
    )
      bookingKeys.current.delete(selection);
    const key = bookingKeys.current.get(selection) ?? crypto.randomUUID();
    bookingKeys.current.set(selection, key);
    setBookingNames({
      venueName: venue.name,
      spaceName: space.name,
    });
    setReservationBusy(true);
    setError("");
    try {
      const createdReservation = await apiRequest<Reservation>(
        "/reservations",
        accessToken,
        {
          method: "POST",
          headers: {
            "Idempotency-Key": key,
            "X-Correlation-Id": crypto.randomUUID(),
          },
          body: JSON.stringify({
            sportSpaceId: availabilityForBooking.sportSpaceId,
            startsAt: first.startsAt,
            endsAt: last.endsAt,
          }),
        },
      );
      setReservation(createdReservation);
      router.push(`/actividad?reservation=${createdReservation.id}`);
    } catch (reason) {
      setPreparingCheckout(false);
      setError(
        reason instanceof Error
          ? reason.message
          : "No se pudo reservar el horario.",
      );
      setAvailability(null);
    } finally {
      bookingInFlight.current = false;
      setReservationBusy(false);
    }
  }

  async function beginCheckout(slots = selectedSlots) {
    if (!selectedVenue || !selectedSpace || !availability) return;
    await createCheckout(selectedVenue, selectedSpace, availability, slots);
  }

  async function reserveOffer(offer: VenueOffer) {
    const { slot } = offer;
    setSelectedVenue(offer.venue);
    setSpaces([offer.space]);
    setSelectedSpace(offer.space);
    setAvailability(offer.availability);
    setSelectedSlots([slot]);
    await createCheckout(offer.venue, offer.space, offer.availability, [slot]);
  }

  const reservationId = reservation?.id;
  useEffect(() => {
    if (!selectedVenue || !showOtherSchedules) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => {
      schedulesDialogRef.current?.focus();
    });
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeVenueSchedules();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedVenue, showOtherSchedules]);

  useEffect(() => {
    if (!reservationId) return;
    const timer = window.setTimeout(() => {
      checkoutRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [reservationId]);

  const money = (slot: Slot) =>
    new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: slot.currency,
    }).format(slot.priceMinor / 100);
  const formatMinor = (amountMinor: number) =>
    new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(amountMinor / 100);
  const time = (value: string) =>
    new Intl.DateTimeFormat("es-PE", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/Lima",
    }).format(new Date(value));
  const selectedTotal = selectedSlots.reduce(
    (total, slot) => total + slot.priceMinor,
    0,
  );
  const selectedDuration = selectedSlots.reduce(
    (total, slot) =>
      total +
      (new Date(slot.endsAt).getTime() - new Date(slot.startsAt).getTime()) /
        60000,
    0,
  );
  const reservationDates = useMemo(() => {
    const start = new Date(`${localDate()}T12:00:00`);
    return Array.from({ length: 6 }, (_, index) => {
      const current = new Date(start);
      current.setDate(start.getDate() + index);
      const value = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Lima",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(current);
      return {
        value,
        weekday:
          index === 0
            ? "Hoy"
            : new Intl.DateTimeFormat("es-PE", {
                timeZone: "America/Lima",
                weekday: "short",
              })
                .format(current)
                .replace(".", ""),
        day: new Intl.DateTimeFormat("es-PE", {
          timeZone: "America/Lima",
          day: "numeric",
        }).format(current),
      };
    });
  }, []);

  const CatalogRoot = embedded ? "section" : "main";

  if (preparingCheckout) {
    return (
      <section
        aria-live="polite"
        className="reservationPreparation"
        role="status"
      >
        <span aria-hidden="true" className="reservationPreparationSpinner" />
        <p className="eyebrow">RESERVA SEGURA</p>
        <h1>Preparando tu pago</h1>
        <p>
          Estamos validando la cancha y bloqueando el horario exclusivamente
          para ti.
        </p>
      </section>
    );
  }

  return (
    <CatalogRoot
      className={`publicCatalog explorePage ${embedded ? "embeddedVenueCatalog" : ""}`}
    >
      <section className="exploreHero" aria-labelledby="explore-title">
        <div className="exploreHeroCopy">
          <h1 id="explore-title">
            Juega cerca. <span>Reserva rápido.</span>
          </h1>
        </div>

        <form
          className="exploreSearch"
          noValidate
          onSubmit={search}
          role="search"
        >
          <label className="exploreSearchField">
            <MagnifyingGlass aria-hidden="true" size={24} weight="bold" />
            <span className="srOnly">Buscar por cancha, deporte o zona</span>
            <input
              value={district}
              onChange={(event) => setDistrict(event.target.value)}
              placeholder="Cancha, deporte o zona"
            />
          </label>
          <button
            aria-expanded={showFilters}
            aria-label={showFilters ? "Ocultar filtros" : "Mostrar filtros"}
            onClick={() => setShowFilters((visible) => !visible)}
            type="button"
          >
            <FadersHorizontal aria-hidden="true" size={24} weight="bold" />
          </button>
        </form>

        {showFilters && (
          <div className="exploreFilterRow">
            <label>
              <CalendarBlank aria-hidden="true" size={19} />
              <span>Fecha</span>
              <input
                aria-label="Fecha"
                type="date"
                value={date}
                min={localDate()}
                onChange={(event) => selectDate(event.target.value)}
              />
            </label>
            <label>
              <SoccerBall aria-hidden="true" size={19} />
              <span className="srOnly">Deporte</span>
              <select
                aria-label="Deporte"
                value={sport}
                onChange={(event) => selectSport(event.target.value)}
              >
                <option value="">Todos los deportes</option>
                {catalog.sports.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        <div className="reservationDatePicker" aria-label="Día de reserva">
          <div>
            <p className="eyebrow">ELIGE EL DÍA</p>
            <strong>Complejos con disponibilidad</strong>
          </div>
          <div className="reservationDateList" role="group">
            {reservationDates.map((option) => (
              <button
                aria-pressed={date === option.value}
                className={date === option.value ? "selected" : ""}
                key={option.value}
                onClick={() => selectDate(option.value)}
                type="button"
              >
                <small>{option.weekday}</small>
                <strong>{option.day}</strong>
              </button>
            ))}
          </div>
        </div>

        <div className="discoveryTabs" aria-label="Tipo de resultado">
          {(
            [
              ["all", "Todo"],
              ["venues", "Canchas"],
              ["matches", "Partidos"],
            ] as const
          ).map(([value, label]) => (
            <button
              aria-pressed={discoveryMode === value}
              className={discoveryMode === value ? "active" : ""}
              key={value}
              onClick={() => setDiscoveryMode(value)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {discoveryMode !== "matches" && venues.length > 0 && (
        <div className="exploreFeaturedList" aria-label="Complejos disponibles">
          {(offersLoading
            ? venues
            : venues.filter((venue) => venueOffers[venue.publicSlug])
          ).map((venue, index) => {
            const offer = venueOffers[venue.publicSlug];
            const quickSlots = offer?.availability.slots.slice(0, 2) ?? [];
            return (
              <section
                className="exploreFeaturedSheet"
                aria-label={`Disponibilidad de ${venue.name}`}
                id={venue.publicSlug}
                key={venue.publicSlug}
              >
                <div className="exploreSheetHandle" aria-hidden="true" />
                <div className="exploreVenueIntro">
                  <Image
                    alt={`Cancha deportiva en ${venue.name}`}
                    height={118}
                    src={venueImages[index % venueImages.length]}
                    width={132}
                  />
                  <div>
                    <span className="exploreVenueKicker">
                      COMPLEJO DISPONIBLE
                    </span>
                    <h2>{venue.name}</h2>
                    <p>
                      <Star aria-hidden="true" size={18} weight="fill" /> 4.6
                      <small>· {venue.districtCode}</small>
                    </p>
                    <p className="exploreVenueAddress">
                      <MapPin aria-hidden="true" size={14} weight="fill" />
                      {venue.address}
                    </p>
                    {offer && (
                      <div
                        aria-label={`Características de ${offer.space.name}`}
                        className="venueAttributeChips"
                      >
                        <span>
                          {names.get(offer.space.sportCode) ??
                            offer.space.sportCode}
                        </span>
                        <span>{offer.space.formatCode.replaceAll("_", " ")}</span>
                        {offer.space.indoor && <span>Techada</span>}
                        {Array.from(
                          new Set([
                            ...venue.amenityCodes,
                            ...offer.space.amenityCodes,
                          ]),
                        )
                          .slice(0, 4)
                          .map((code) => (
                            <span key={code}>{names.get(code) ?? code}</span>
                          ))}
                      </div>
                    )}
                    <div className="exploreVenueContactActions">
                      {whatsappUrl(venue.publicPhone) && (
                        <a
                          href={whatsappUrl(venue.publicPhone) ?? undefined}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <WhatsappLogo
                            aria-hidden="true"
                            size={16}
                            weight="fill"
                          />
                          Escribir
                        </a>
                      )}
                      <a
                        href={googleMapsUrl({
                          latitude: venue.latitude,
                          longitude: venue.longitude,
                          address: `${venue.name}, ${venue.address}, Piura`,
                        })}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <MapPin aria-hidden="true" size={16} weight="fill" />
                        Cómo llegar
                      </a>
                    </div>
                  </div>
                </div>
                <div className="exploreSheetAvailability">
                  <h3>Próximos horarios disponibles</h3>
                  {offer ? (
                    <>
                      <p className="exploreCourtName">
                        Cancha: <strong>{offer.space.name}</strong>
                      </p>
                      <div className="exploreQuickSlots">
                        {quickSlots.map((slot) => (
                          <span key={slot.startsAt}>
                            <strong>{time(slot.startsAt)}</strong>
                            <small>
                              {date === localDate() ? "Hoy" : "Disponible"}
                            </small>
                          </span>
                        ))}
                        <b>
                          {money(offer.slot)}
                          <small>por bloque</small>
                        </b>
                      </div>
                      <div className="exploreFeaturedActions">
                        <button
                          className="exploreReservePrimary"
                          disabled={reservationBusy}
                          onClick={() => void reserveOffer(offer)}
                          type="button"
                        >
                          Reservar {time(offer.slot.startsAt)}
                        </button>
                        <button
                          aria-controls="venue-schedules"
                          aria-expanded={
                            showOtherSchedules &&
                            selectedVenue?.publicSlug === venue.publicSlug
                          }
                          className="exploreOtherSchedules"
                          onClick={() => showVenueSchedules(venue)}
                          type="button"
                        >
                          Otros horarios
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="notice">
                      {offersLoading
                        ? "Consultando horarios…"
                        : "La disponibilidad acaba de cambiar."}
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {discoveryMode !== "venues" && (
        <aside className="exploreNearbyMatch">
          <UsersThree aria-hidden="true" size={31} weight="duotone" />
          <span>
            <strong>Faltan 3 jugadores cerca de ti</strong>
            <small>Partido hoy 8:00 p. m. · Fútbol 7</small>
          </span>
          <Link href="/partidos/demo-futbol-7">Ver partido</Link>
        </aside>
      )}

      <section
        className={`section catalogResults exploreResults ${
          selectedVenue && showOtherSchedules ? "hasScheduleModal" : ""
        }`}
        aria-live="polite"
      >
        <div className="sectionHeading">
          <div>
            <p className="eyebrow">CERCA DE TI</p>
            <h2>Opciones para jugar</h2>
          </div>
          {!loading && discoveryMode !== "matches" && (
            <span className="countBadge">{venues.length}</span>
          )}
        </div>
        {error && (
          <p className="inlineAlert errorNotice" role="alert">
            {error}
          </p>
        )}

        {discoveryMode !== "venues" && (
          <article className="exploreMatchResult">
            <div className="exploreMatchIcon">
              <UsersThree aria-hidden="true" size={30} weight="duotone" />
            </div>
            <div>
              <span>PARTIDO · DATOS DE DEMOSTRACIÓN</span>
              <h3>Fútbol 7 en Los Ejidos</h3>
              <p>Hoy, 8:00 p. m. · Nivel intermedio · 3 cupos</p>
            </div>
            <Link href="/partidos/demo-futbol-7">Ver partido</Link>
          </article>
        )}

        {discoveryMode !== "matches" &&
          (loading ? (
            <CardSkeletons
              count={2}
              label="Buscando complejos disponibles"
              variant="venue"
            />
          ) : venues.length === 0 ? (
            <div className="empty">
              <h3>Aún no hay opciones para esta búsqueda</h3>
              <p>Prueba otra fecha, deporte o distrito.</p>
            </div>
          ) : null)}

        {selectedVenue && showOtherSchedules && (
          <div
            className="scheduleModalBackdrop"
            onMouseDown={(event) => {
              if (event.currentTarget === event.target) closeVenueSchedules();
            }}
          >
            <div
              aria-labelledby="schedule-modal-title"
              aria-modal="true"
              className="scheduleModal"
              id="venue-schedules"
              ref={schedulesDialogRef}
              role="dialog"
              tabIndex={-1}
            >
              <header className="scheduleModalHeader">
                <div>
                  <p className="eyebrow">{selectedVenue.name}</p>
                  <h2 id="schedule-modal-title">Elige cancha y horario</h2>
                  <p>
                    {new Intl.DateTimeFormat("es-PE", {
                      dateStyle: "full",
                      timeZone: "America/Lima",
                    }).format(new Date(`${date}T12:00:00-05:00`))}
                  </p>
                </div>
                <button
                  aria-label="Cerrar horarios"
                  className="scheduleModalClose"
                  onClick={closeVenueSchedules}
                  type="button"
                >
                  <X aria-hidden="true" size={22} weight="bold" />
                </button>
              </header>

              <div className="scheduleModalBody">
                {error && (
                  <p className="inlineAlert errorNotice" role="alert">
                    {error}
                  </p>
                )}
                {detailLoading && !selectedSpace ? (
                  <div className="scheduleLoading" role="status">
                    <span />
                    Consultando canchas y horarios…
                  </div>
                ) : spaces.length === 0 ? (
                  <p className="empty compactEmpty">
                    Este complejo no tiene canchas publicadas para reservar.
                  </p>
                ) : (
                  <>
                    <div
                      className="scheduleCourtChoices"
                      role="group"
                      aria-label="Seleccionar cancha"
                    >
                      {spaces.map((space) => (
                        <button
                          aria-pressed={selectedSpace?.id === space.id}
                          className={
                            selectedSpace?.id === space.id ? "selected" : ""
                          }
                          key={space.id}
                          onClick={() => void openSpace(space)}
                          type="button"
                        >
                          <strong>{space.name}</strong>
                          <span>
                            {names.get(space.sportCode) ?? space.sportCode} ·{" "}
                            {space.formatCode}
                          </span>
                          {space.amenityCodes.length > 0 && (
                            <small>
                              {space.amenityCodes
                                .slice(0, 3)
                                .map((code) => names.get(code) ?? code)
                                .join(" · ")}
                            </small>
                          )}
                        </button>
                      ))}
                    </div>

                    {selectedSpace && (
                      <section className="scheduleSlotSection">
                        <div className="scheduleSlotHeading">
                          <div>
                            <p className="eyebrow">HORARIOS DISPONIBLES</p>
                            <h3>{selectedSpace.name}</h3>
                          </div>
                          <small>Selecciona bloques consecutivos</small>
                        </div>
                        {detailLoading ? (
                          <div className="scheduleLoading" role="status">
                            <span />
                            Actualizando horarios…
                          </div>
                        ) : availability?.slots.length ? (
                          <div
                            className="scheduleSlotGrid"
                            role="group"
                            aria-label={`Horarios de ${selectedSpace.name}`}
                          >
                            {availability.slots.map((slot) => {
                              const selected = selectedSlots.some(
                                (item) => item.startsAt === slot.startsAt,
                              );
                              return (
                                <button
                                  aria-pressed={selected}
                                  className={selected ? "selected" : ""}
                                  disabled={reservationBusy}
                                  key={`${slot.startsAt}-${slot.endsAt}`}
                                  onClick={() => toggleSlot(slot)}
                                  type="button"
                                >
                                  <Clock aria-hidden="true" size={18} />
                                  <strong>
                                    {time(slot.startsAt)} – {time(slot.endsAt)}
                                  </strong>
                                  <span>{money(slot)}</span>
                                  <small>
                                    {selected ? "Elegido" : "Disponible"}
                                  </small>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="scheduleNoSlots" role="status">
                            No quedan horarios disponibles para esta cancha en
                            la fecha seleccionada. Puedes elegir otra cancha.
                          </p>
                        )}
                      </section>
                    )}
                  </>
                )}
              </div>

              <footer className="scheduleModalFooter" role="status">
                <span>
                  <small>
                    {selectedSlots.length > 0
                      ? "Tu selección"
                      : "Selecciona un horario para reservar"}
                  </small>
                  {selectedSlots.length > 0 ? (
                    <>
                      <strong>
                        {time(selectedSlots[0].startsAt)} –{" "}
                        {time(selectedSlots.at(-1)!.endsAt)}
                      </strong>
                      <em>
                        {selectedDuration} min · {formatMinor(selectedTotal)}
                      </em>
                    </>
                  ) : (
                    <em>Puedes elegir una o varias horas consecutivas.</em>
                  )}
                </span>
                <button
                  className="primary"
                  disabled={reservationBusy || selectedSlots.length === 0}
                  onClick={() => void beginCheckout()}
                  type="button"
                >
                  {reservationBusy
                    ? "Bloqueando horario…"
                    : "Reservar e ir al pago"}
                  <ArrowRight aria-hidden="true" size={19} />
                </button>
              </footer>
            </div>
          </div>
        )}

        {reservation && accessToken && selectedVenue && (
          <section
            ref={checkoutRef}
            tabIndex={-1}
            className="checkoutDestination"
          >
            <ReservationCheckout
              key={reservation.id}
              accessToken={accessToken}
              reservation={reservation}
              venueName={bookingNames.venueName}
              spaceName={bookingNames.spaceName}
              onChange={setReservation}
            />
          </section>
        )}
      </section>
    </CatalogRoot>
  );
}
