"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { apiRequest } from "@/lib/api";
type Organization = { id: string; name: string };
type Venue = { id: string; name: string };
type Space = { id: string; name: string; status: string };
type Court = Space & { organization: Organization; venue: Venue };
export function EnabledCourts({
  organizations,
}: {
  organizations: Organization[];
}) {
  const { accessToken } = useAuth();
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    const controller = new AbortController();
    const options = { signal: controller.signal };
    void Promise.all(
      organizations.map(async (organization) => {
        const venues = await apiRequest<Venue[]>(
          `/organizations/${organization.id}/venues`,
          accessToken,
          options,
        );
        return (
          await Promise.all(
            venues.map(async (venue) => {
              const spaces = await apiRequest<Space[]>(
                `/organizations/${organization.id}/venues/${venue.id}/spaces`,
                accessToken,
                options,
              );
              return spaces
                .filter((space) => space.status === "PUBLISHED")
                .map((space) => ({ ...space, organization, venue }));
            }),
          )
        ).flat();
      }),
    )
      .then((results) => {
        if (active) setCourts(results.flat());
      })
      .catch(() => {
        if (active) setError("No se pudieron cargar las canchas habilitadas.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [accessToken, organizations, retry]);
  if (loading) return <p role="status">Cargando canchas…</p>;
  if (error)
    return (
      <div className="notice" role="alert">
        <p>{error}</p>
        <button
          className="secondary"
          type="button"
          onClick={() => {
            setError(null);
            setLoading(true);
            setRetry((value) => value + 1);
          }}
        >
          Reintentar
        </button>
      </div>
    );
  return (
    <section aria-label="Canchas habilitadas">
      <p className="muted">Accede a los horarios y precios de cada cancha.</p>
      {courts.length === 0 ? (
        <p className="empty">Todavía no tienes canchas habilitadas.</p>
      ) : (
        <div className="organizationList">
          {courts.map((court) => (
            <article className="card" key={court.id}>
              <span className="pill">Habilitada</span>
              <h3>{court.name}</h3>
              <p>
                {court.venue.name} · {court.organization.name}
              </p>
              <Link
                className="primary"
                href={`/admin/${court.organization.id}?venueId=${encodeURIComponent(court.venue.id)}&spaceId=${encodeURIComponent(court.id)}`}
              >
                Gestionar {court.name}
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
