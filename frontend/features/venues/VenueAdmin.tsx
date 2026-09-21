"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowRight, Check } from "@phosphor-icons/react";
import { useAuth } from "@/features/auth/AuthProvider";
import { FriendlyLocationPicker } from "@/components/forms/FriendlyLocationPicker";
import { AvailabilityAdmin } from "@/features/venues/AvailabilityAdmin";
import { apiRequest } from "@/lib/api";

type CatalogItem = { code: string; name: string };
type SportFormat = CatalogItem & {
  sportCode: string;
  recommendedCapacity: number | null;
};
type Amenity = CatalogItem & { scope: "VENUE" | "SPORT_SPACE" | "BOTH" };
type VenueCatalog = {
  sports: CatalogItem[];
  formats: SportFormat[];
  surfaces: CatalogItem[];
  amenities: Amenity[];
};
type Venue = {
  id: string;
  name: string;
  address: string;
  districtCode: string;
  publicPhone: string | null;
  amenityCodes: string[];
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  version: number;
};
type SportSpace = {
  id: string;
  venueId: string;
  name: string;
  sportCode: string;
  formatCode: string;
  capacity: number;
  surfaceType: string | null;
  indoor: boolean;
  amenityCodes: string[];
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  version: number;
};

type SetupStep = "venue" | "space" | "availability";
type VenueDraft = {
  name: string;
  address: string;
  districtCode: string;
  publicPhone: string;
  latitude: string;
  longitude: string;
  amenityCodes: string[];
};
type SpaceDraft = {
  name: string;
  sportCode: string;
  formatCode: string;
  capacity: string;
  surfaceType: string;
  indoor: boolean;
  amenityCodes: string[];
};
type VenueSetupDraft = {
  setupStep: SetupStep;
  selectedVenueId: string | null;
  selectedSpaceId: string | null;
  venue: VenueDraft;
  space: SpaceDraft;
};

const emptyCatalog: VenueCatalog = {
  sports: [],
  formats: [],
  surfaces: [],
  amenities: [],
};

const emptyVenueDraft: VenueDraft = {
  name: "",
  address: "",
  districtCode: "",
  publicPhone: "",
  latitude: "",
  longitude: "",
  amenityCodes: [],
};

const emptySpaceDraft: SpaceDraft = {
  name: "",
  sportCode: "",
  formatCode: "",
  capacity: "",
  surfaceType: "",
  indoor: false,
  amenityCodes: [],
};

export function VenueAdmin({
  organizationId,
  role,
}: {
  organizationId: string;
  role: "OWNER" | "ADMIN" | "OPERATOR";
}) {
  const canManage = role === "OWNER" || role === "ADMIN";
  const { accessToken, user } = useAuth();
  const [catalog, setCatalog] = useState(emptyCatalog);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [spaces, setSpaces] = useState<SportSpace[]>([]);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  const [editingSpace, setEditingSpace] = useState<SportSpace | null>(null);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [setupStep, setSetupStep] = useState<SetupStep>("venue");
  const [venueDraft, setVenueDraft] = useState<VenueDraft>(emptyVenueDraft);
  const [spaceDraft, setSpaceDraft] = useState<SpaceDraft>(emptySpaceDraft);
  const [draftReady, setDraftReady] = useState(false);
  const [pendingArchive, setPendingArchive] = useState<
    { kind: "venue"; item: Venue } | { kind: "space"; item: SportSpace } | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const draftStorageKey = `pulso:venue-setup:${String(user?.profile.sub ?? "current")}:${organizationId}`;

  const selectedVenue = useMemo(
    () => venues.find((venue) => venue.id === selectedVenueId) ?? null,
    [selectedVenueId, venues],
  );
  const selectedSpace = useMemo(
    () => spaces.find((space) => space.id === selectedSpaceId) ?? null,
    [selectedSpaceId, spaces],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDraftReady(false);
      try {
        const saved = window.sessionStorage.getItem(draftStorageKey);
        if (saved) {
          const draft = JSON.parse(saved) as Partial<VenueSetupDraft>;
          if (["venue", "space", "availability"].includes(String(draft.setupStep))) {
            setSetupStep(draft.setupStep as SetupStep);
          }
          if (draft.selectedVenueId !== undefined) setSelectedVenueId(draft.selectedVenueId);
          if (draft.selectedSpaceId !== undefined) setSelectedSpaceId(draft.selectedSpaceId);
          if (draft.venue) setVenueDraft({ ...emptyVenueDraft, ...draft.venue });
          if (draft.space) setSpaceDraft({ ...emptySpaceDraft, ...draft.space });
        }
      } catch {
        window.sessionStorage.removeItem(draftStorageKey);
      } finally {
        setDraftReady(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [draftStorageKey]);

  useEffect(() => {
    if (!draftReady) return;
    const draft: VenueSetupDraft = {
      setupStep,
      selectedVenueId,
      selectedSpaceId,
      venue: venueDraft,
      space: spaceDraft,
    };
    window.sessionStorage.setItem(draftStorageKey, JSON.stringify(draft));
  }, [draftReady, draftStorageKey, selectedSpaceId, selectedVenueId, setupStep, spaceDraft, venueDraft]);

  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    Promise.all([
      apiRequest<VenueCatalog>("/venue-catalogs", accessToken),
      apiRequest<Venue[]>(
        `/organizations/${organizationId}/venues`,
        accessToken,
      ),
    ])
      .then(([catalogResult, venueResult]) => {
        if (!active) return;
        setCatalog(catalogResult);
        setVenues(venueResult);
        setSelectedVenueId((current) =>
          current && venueResult.some((venue) => venue.id === current)
            ? current
            : venueResult[0]?.id ?? null,
        );
      })
      .catch((requestError: unknown) => {
        if (active) setError(errorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [accessToken, organizationId]);

  useEffect(() => {
    if (!accessToken || !selectedVenueId) return;
    let active = true;
    void apiRequest<SportSpace[]>(
      `/organizations/${organizationId}/venues/${selectedVenueId}/spaces`,
      accessToken,
    )
      .then((result) => {
        if (!active) return;
        setSpaces(result);
        setSelectedSpaceId((current) =>
          current && result.some((space) => space.id === current)
            ? current
            : result[0]?.id ?? null,
        );
      })
      .catch((requestError: unknown) => {
        if (active) setError(errorMessage(requestError));
      });
    return () => {
      active = false;
    };
  }, [accessToken, organizationId, selectedVenueId]);

  async function saveVenue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSubmitting(true);
    clearFeedback();
    try {
      const payload = {
        name: form.get("name"),
        address: form.get("address"),
        districtCode: form.get("districtCode"),
        latitude: nullableNumber(form.get("latitude")),
        longitude: nullableNumber(form.get("longitude")),
        publicPhone: nullableText(form.get("publicPhone")),
        amenityCodes: form.getAll("amenityCodes"),
        ...(editingVenue ? { version: editingVenue.version } : {}),
      };
      const venue = await apiRequest<Venue>(
        editingVenue
          ? `/organizations/${organizationId}/venues/${editingVenue.id}`
          : `/organizations/${organizationId}/venues`,
        accessToken,
        {
          method: editingVenue ? "PUT" : "POST",
          body: JSON.stringify(payload),
        },
      );
      setVenues((current) => upsertById(current, venue));
      setSpaces([]);
      setSelectedSpaceId(null);
      setSelectedVenueId(venue.id);
      setEditingVenue(null);
      setVenueDraft(emptyVenueDraft);
      setSetupStep("space");
      setMessage(
        editingVenue ? "Sede actualizada." : "Sede creada como borrador.",
      );
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  async function saveSpace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !selectedVenueId) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSubmitting(true);
    clearFeedback();
    try {
      const payload = {
        name: form.get("name"),
        sportCode: form.get("sportCode"),
        formatCode: form.get("formatCode"),
        capacity: Number(form.get("capacity")),
        surfaceType: nullableText(form.get("surfaceType")),
        indoor: form.get("indoor") === "on",
        amenityCodes: form.getAll("amenityCodes"),
        ...(editingSpace ? { version: editingSpace.version } : {}),
      };
      const space = await apiRequest<SportSpace>(
        editingSpace
          ? `/organizations/${organizationId}/spaces/${editingSpace.id}`
          : `/organizations/${organizationId}/venues/${selectedVenueId}/spaces`,
        accessToken,
        {
          method: editingSpace ? "PUT" : "POST",
          body: JSON.stringify(payload),
        },
      );
      setSpaces((current) => upsertById(current, space));
      setSelectedSpaceId(space.id);
      setEditingSpace(null);
      setSpaceDraft(emptySpaceDraft);
      setSetupStep("availability");
      setMessage(
        editingSpace ? "Cancha actualizada." : "Cancha creada como borrador.",
      );
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  function clearFeedback() {
    setError(null);
    setMessage(null);
  }

  function selectVenue(venueId: string) {
    if (venueId !== selectedVenueId) {
      setSpaces([]);
      setSelectedSpaceId(null);
      setEditingSpace(null);
      setSpaceDraft(emptySpaceDraft);
      setSelectedVenueId(venueId);
    }
    setSetupStep("space");
  }

  function editVenue(venue: Venue) {
    setEditingVenue(venue);
    setVenueDraft({
      name: venue.name,
      address: venue.address,
      districtCode: venue.districtCode,
      publicPhone: venue.publicPhone ?? "",
      latitude: "",
      longitude: "",
      amenityCodes: venue.amenityCodes,
    });
    setSetupStep("venue");
  }

  function editSpace(space: SportSpace) {
    setEditingSpace(space);
    setSpaceDraft({
      name: space.name,
      sportCode: space.sportCode,
      formatCode: space.formatCode,
      capacity: String(space.capacity),
      surfaceType: space.surfaceType ?? "",
      indoor: space.indoor,
      amenityCodes: space.amenityCodes,
    });
    setSetupStep("space");
  }

  function cancelVenueEdit() {
    setEditingVenue(null);
    setVenueDraft(emptyVenueDraft);
  }

  function cancelSpaceEdit() {
    setEditingSpace(null);
    setSpaceDraft(emptySpaceDraft);
  }

  function openStep(step: SetupStep) {
    if (step === "space" && !selectedVenue) return;
    if (step === "availability" && !selectedSpace) return;
    setSetupStep(step);
  }

  async function publishVenue(venue: Venue) {
    if (!accessToken) return;
    await runMutation(async () => {
      const updated = await apiRequest<Venue>(
        `/organizations/${organizationId}/venues/${venue.id}/publish`,
        accessToken,
        { method: "POST" },
      );
      setVenues((current) => upsertById(current, updated));
      return "Sede publicada.";
    });
  }

  async function archiveVenue(venue: Venue) {
    if (!accessToken) return;
    await runMutation(async () => {
      await apiRequest<void>(
        `/organizations/${organizationId}/venues/${venue.id}`,
        accessToken,
        { method: "DELETE" },
      );
      setVenues((current) =>
        current.map((item) =>
          item.id === venue.id ? { ...item, status: "ARCHIVED" } : item,
        ),
      );
      setEditingVenue(null);
      if (selectedVenueId === venue.id) setSelectedSpaceId(null);
      return "Sede archivada.";
    });
  }

  async function publishSpace(space: SportSpace) {
    if (!accessToken) return;
    await runMutation(async () => {
      const updated = await apiRequest<SportSpace>(
        `/organizations/${organizationId}/spaces/${space.id}/publish`,
        accessToken,
        { method: "POST" },
      );
      setSpaces((current) => upsertById(current, updated));
      return "Cancha publicada.";
    });
  }

  async function archiveSpace(space: SportSpace) {
    if (!accessToken) return;
    await runMutation(async () => {
      await apiRequest<void>(
        `/organizations/${organizationId}/spaces/${space.id}`,
        accessToken,
        { method: "DELETE" },
      );
      setSpaces((current) =>
        current.map((item) =>
          item.id === space.id ? { ...item, status: "ARCHIVED" } : item,
        ),
      );
      if (selectedSpaceId === space.id) setSelectedSpaceId(null);
      setEditingSpace(null);
      return "Cancha archivada.";
    });
  }

  async function runMutation(operation: () => Promise<string>) {
    setSubmitting(true);
    clearFeedback();
    try {
      setMessage(await operation());
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmArchive() {
    if (!pendingArchive) return;
    const operation = pendingArchive;
    setPendingArchive(null);
    if (operation.kind === "venue") await archiveVenue(operation.item);
    else await archiveSpace(operation.item);
  }

  if (loading) return <div className="notice">Cargando sedes y canchas…</div>;

  return (
    <section className="venueAdmin" aria-labelledby="venue-admin-title">
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">OPERACIÓN</p>
          <h2 id="venue-admin-title">Sedes y canchas</h2>
        </div>
        <span className="countBadge">{venues.length}</span>
      </div>

      {error && (
        <div className="inlineAlert errorNotice" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="inlineAlert successNotice" role="status">
          {message}
        </div>
      )}

      <nav className="venueSetupTabs" aria-label="Creación del complejo">
        <ol>
          {(
            [
              ["venue", "Sede"],
              ["space", "Cancha"],
              ["availability", "Horarios"],
            ] as const
          ).map(([step, label], index) => {
            const active = setupStep === step;
            const completed =
              (step === "venue" && Boolean(selectedVenue)) ||
              (step === "space" && Boolean(selectedSpace));
            const disabled =
              (step === "space" && !selectedVenue) ||
              (step === "availability" && !selectedSpace);
            return (
              <li
                className={`${active ? "active" : ""} ${completed && !active ? "completed" : ""}`}
                key={step}
              >
                <button
                  aria-current={active ? "step" : undefined}
                  disabled={disabled}
                  onClick={() => openStep(step)}
                  type="button"
                >
                  <span>{completed && !active ? <Check size={15} weight="bold" /> : index + 1}</span>
                  <small>{label}</small>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {pendingArchive && (
        <aside
          className="inlineConfirm"
          aria-labelledby="archive-title"
          role="region"
        >
          <div>
            <strong id="archive-title">
              ¿Archivar {pendingArchive.item.name}?
            </strong>
            <p>
              Dejará de estar disponible para nuevas reservas. Esta acción se
              conserva en el historial.
            </p>
          </div>
          <div>
            <button
              className="secondary"
              onClick={() => setPendingArchive(null)}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="dangerButton"
              disabled={submitting}
              onClick={() => void confirmArchive()}
              type="button"
            >
              Archivar
            </button>
          </div>
        </aside>
      )}

      <div className="venueWorkspace">
        {setupStep === "venue" && (
          <div className="venueColumn setupPanel">
            <div className="venueSetupPanelTitle">
              <span>1</span>
              <div>
                <h3>Datos de la sede</h3>
                <p>Registra la ubicación principal de tu complejo deportivo.</p>
              </div>
            </div>
            <h4 className="venueResourceHeading">Sedes registradas</h4>
            {venues.length === 0 ? (
              <div className="compactEmpty">
                <p>Aún no registraste una sede.</p>
              </div>
            ) : (
              <div className="venueList" role="list">
                {venues.map((venue) => (
                  <div
                    className={`venueSelector ${selectedVenueId === venue.id ? "selected" : ""}`}
                    key={venue.id}
                  >
                    <button
                      className="resourceSelect"
                      onClick={() => selectVenue(venue.id)}
                      type="button"
                    >
                      <span>
                        <strong>{venue.name}</strong>
                        <small>{venue.address}</small>
                      </span>
                      <span className="resourceSelectMeta">
                        <span className="pill">{venue.status}</span>
                        <ArrowRight aria-hidden="true" size={18} />
                      </span>
                    </button>
                    {canManage && venue.status !== "ARCHIVED" && (
                      <div className="resourceActions">
                        <button
                          className="secondary"
                          type="button"
                          onClick={() => editVenue(venue)}
                        >
                          Editar
                        </button>
                        {venue.status === "DRAFT" && (
                          <button
                            className="secondary"
                            type="button"
                            disabled={submitting}
                            onClick={() => void publishVenue(venue)}
                          >
                            Publicar
                          </button>
                        )}
                        <button
                          className="dangerButton"
                          type="button"
                          disabled={submitting}
                          onClick={() =>
                            setPendingArchive({ kind: "venue", item: venue })
                          }
                        >
                          Archivar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {canManage && (
              <VenueForm
                key={editingVenue?.id ?? "new-venue"}
                initial={editingVenue}
                value={venueDraft}
                onChange={setVenueDraft}
                amenities={catalog.amenities.filter(
                  (item) => item.scope !== "SPORT_SPACE",
                )}
                disabled={submitting}
                onSubmit={saveVenue}
                onCancel={
                  editingVenue ? cancelVenueEdit : undefined
                }
              />
            )}
          </div>
        )}

        {setupStep === "space" && (
          <div className="venueColumn setupPanel">
            <div className="venueSetupPanelTitle">
              <span>2</span>
              <div>
                <h3>Datos de la cancha</h3>
                <p>{selectedVenue ? `Agrega las canchas disponibles en ${selectedVenue.name}.` : "Primero completa los datos de la sede."}</p>
              </div>
            </div>
            <h4 className="venueResourceHeading">Canchas registradas</h4>
            {!selectedVenue ? (
              <div className="compactEmpty">
                <p>Selecciona o crea una sede para continuar.</p>
              </div>
            ) : spaces.length === 0 ? (
              <div className="compactEmpty">
                <p>Esta sede todavía no tiene canchas.</p>
              </div>
            ) : (
              <div className="spaceList">
                {spaces.map((space) => (
                  <article
                    className={`spaceCard ${selectedSpaceId === space.id ? "selected" : ""}`}
                    key={space.id}
                  >
                    <button
                      className="resourceSelect"
                      type="button"
                      onClick={() => {
                        setSelectedSpaceId(space.id);
                        setSetupStep("availability");
                      }}
                    >
                      <span>
                        <strong>{space.name}</strong>
                        <small>
                          {labelFor(catalog.sports, space.sportCode)} ·{" "}
                          {labelFor(catalog.formats, space.formatCode)}
                        </small>
                      </span>
                      <span className="resourceSelectMeta">
                        <span className="pill">{space.status}</span>
                        <ArrowRight aria-hidden="true" size={18} />
                      </span>
                    </button>
                    {canManage && space.status !== "ARCHIVED" && (
                      <div className="resourceActions">
                        <button
                          className="secondary"
                          type="button"
                          onClick={() => editSpace(space)}
                        >
                          Editar
                        </button>
                        {space.status === "DRAFT" && (
                          <button
                            className="secondary"
                            type="button"
                            disabled={
                              submitting ||
                              selectedVenue?.status !== "PUBLISHED"
                            }
                            onClick={() => void publishSpace(space)}
                          >
                            Publicar
                          </button>
                        )}
                        <button
                          className="dangerButton"
                          type="button"
                          disabled={submitting}
                          onClick={() =>
                            setPendingArchive({ kind: "space", item: space })
                          }
                        >
                          Archivar
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
            {canManage &&
              selectedVenue &&
              selectedVenue.status !== "ARCHIVED" && (
                <SpaceForm
                  key={editingSpace?.id ?? `new-space-${selectedVenue.id}`}
                  initial={editingSpace}
                  value={spaceDraft}
                  onChange={setSpaceDraft}
                  catalog={catalog}
                  disabled={submitting}
                  onSubmit={saveSpace}
                  onCancel={
                    editingSpace ? cancelSpaceEdit : undefined
                  }
                />
              )}
            <div className="venueStepActions">
              <button className="secondary" onClick={() => openStep("venue")} type="button">
                Volver a sede
              </button>
            </div>
          </div>
        )}
      </div>

      {setupStep === "availability" &&
        selectedSpace &&
        selectedSpace.status !== "ARCHIVED" && (
          <div className="venueAvailabilityStep">
            <div className="venueSetupPanelTitle">
              <span>3</span>
              <div>
                <h3>Horarios y precios</h3>
                <p>Define cuándo se puede reservar {selectedSpace.name}.</p>
              </div>
            </div>
            <AvailabilityAdmin
              key={selectedSpace.id}
              organizationId={organizationId}
              space={selectedSpace}
              role={role}
            />
            <div className="venueStepActions">
              <button className="secondary" onClick={() => openStep("space")} type="button">
                Volver a canchas
              </button>
            </div>
          </div>
        )}
      {setupStep === "availability" && !selectedSpace && (
        <div className="compactEmpty setupEmpty">
          <p>
            Primero crea o selecciona una cancha. Luego podrás definir días,
            horas y precios.
          </p>
          <button
            className="secondary"
            onClick={() => setSetupStep("space")}
            type="button"
          >
            Ir a canchas
          </button>
        </div>
      )}
    </section>
  );
}

function VenueForm({
  initial,
  value,
  onChange,
  amenities,
  disabled,
  onSubmit,
  onCancel,
}: {
  initial: Venue | null;
  value: VenueDraft;
  onChange: (value: VenueDraft) => void;
  amenities: Amenity[];
  disabled: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel?: () => void;
}) {
  return (
    <form className="card adminForm compactForm venueSetupForm" noValidate onSubmit={onSubmit}>
      <h4>{initial ? "Editar sede" : "Nueva sede"}</h4>
      <label>
        Nombre
        <input
          name="name"
          maxLength={160}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
          required
          value={value.name}
        />
      </label>
      <label>
        Dirección para llegar
        <input
          name="address"
          maxLength={240}
          onChange={(event) => onChange({ ...value, address: event.target.value })}
          required
          value={value.address}
        />
      </label>
      <FriendlyLocationPicker
        addressFieldName="address"
        districtFieldName="districtCode"
        key={`${initial?.id ?? "new"}-${value.latitude}-${value.longitude}`}
        latitude={value.latitude}
        longitude={value.longitude}
        onCoordinatesChange={(latitude, longitude) =>
          onChange({ ...value, latitude, longitude })
        }
      />
      <label>
        Distrito
        <input
          name="districtCode"
          maxLength={60}
          onChange={(event) => onChange({ ...value, districtCode: event.target.value })}
          required
          value={value.districtCode}
        />
      </label>
      <label>
        Teléfono público
        <input
          name="publicPhone"
          maxLength={30}
          inputMode="tel"
          onChange={(event) => onChange({ ...value, publicPhone: event.target.value })}
          value={value.publicPhone}
        />
      </label>
      <AmenityFields
        amenities={amenities}
        onChange={(amenityCodes) => onChange({ ...value, amenityCodes })}
        selected={value.amenityCodes}
      />
      {onCancel && (
        <button className="secondary" type="button" onClick={onCancel}>
          Cancelar edición
        </button>
      )}
      <button className="primary borderless" disabled={disabled}>
        {initial ? "Guardar cambios" : "Crear sede"}
      </button>
    </form>
  );
}

function SpaceForm({
  initial,
  value,
  onChange,
  catalog,
  disabled,
  onSubmit,
  onCancel,
}: {
  initial: SportSpace | null;
  value: SpaceDraft;
  onChange: (value: SpaceDraft) => void;
  catalog: VenueCatalog;
  disabled: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel?: () => void;
}) {
  const sportCode = value.sportCode || catalog.sports[0]?.code || "";
  const formats = catalog.formats.filter(
    (format) => format.sportCode === sportCode,
  );
  const formatCode = formats.some((format) => format.code === value.formatCode)
    ? value.formatCode
    : formats[0]?.code ?? "";
  return (
    <form className="card adminForm compactForm venueSetupForm" noValidate onSubmit={onSubmit}>
      <h4>{initial ? "Editar cancha" : "Nueva cancha"}</h4>
      <label>
        Nombre
        <input
          name="name"
          maxLength={160}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
          required
          value={value.name}
        />
      </label>
      <label>
        Deporte
        <select
          name="sportCode"
          value={sportCode}
          onChange={(event) => {
            const nextSport = event.target.value;
            const nextFormat = catalog.formats.find(
              (format) => format.sportCode === nextSport,
            );
            onChange({
              ...value,
              sportCode: nextSport,
              formatCode: nextFormat?.code ?? "",
            });
          }}
          required
        >
          {catalog.sports.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Modalidad
        <select
          name="formatCode"
          onChange={(event) => onChange({ ...value, formatCode: event.target.value })}
          required
          value={formatCode}
        >
          {formats.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Capacidad
        <input
          name="capacity"
          type="number"
          inputMode="numeric"
          min={1}
          onChange={(event) => onChange({ ...value, capacity: event.target.value })}
          required
          value={value.capacity}
        />
      </label>
      <label>
        Superficie
        <select
          name="surfaceType"
          onChange={(event) => onChange({ ...value, surfaceType: event.target.value })}
          value={value.surfaceType}
        >
          <option value="">Sin especificar</option>
          {catalog.surfaces.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="check">
        <input
          checked={value.indoor}
          name="indoor"
          onChange={(event) => onChange({ ...value, indoor: event.target.checked })}
          type="checkbox"
        />{" "}
        Espacio techado
      </label>
      <AmenityFields
        amenities={catalog.amenities.filter((item) => item.scope !== "VENUE")}
        onChange={(amenityCodes) => onChange({ ...value, amenityCodes })}
        selected={value.amenityCodes}
      />
      {onCancel && (
        <button className="secondary" type="button" onClick={onCancel}>
          Cancelar edición
        </button>
      )}
      <button
        className="primary borderless"
        disabled={disabled || formats.length === 0}
      >
        {initial ? "Guardar cambios" : "Crear cancha"}
      </button>
    </form>
  );
}

function AmenityFields({
  amenities,
  selected = [],
  onChange,
}: {
  amenities: Amenity[];
  selected?: string[];
  onChange: (selected: string[]) => void;
}) {
  if (amenities.length === 0) return null;
  return (
    <fieldset className="amenityFields">
      <legend>Amenidades</legend>
      {amenities.map((item) => (
        <label className="check" key={item.code}>
          <input
            name="amenityCodes"
            type="checkbox"
            value={item.code}
            checked={selected.includes(item.code)}
            onChange={(event) =>
              onChange(
                event.target.checked
                  ? [...selected, item.code]
                  : selected.filter((code) => code !== item.code),
              )
            }
          />{" "}
          {item.name}
        </label>
      ))}
    </fieldset>
  );
}

function nullableText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function nullableNumber(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "No se pudo completar la operación.";
}

function labelFor(items: CatalogItem[], code: string) {
  return items.find((item) => item.code === code)?.name ?? code;
}

function upsertById<T extends { id: string }>(items: T[], updated: T) {
  return items.some((item) => item.id === updated.id)
    ? items.map((item) => (item.id === updated.id ? updated : item))
    : [...items, updated];
}
