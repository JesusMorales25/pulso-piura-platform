"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import styles from "./ProfilePage.module.css";
import {
  AddressBook,
  CaretRight,
  CheckCircle,
  Eye,
  FloppyDisk,
  MapPin,
  ShieldCheck,
  SignOut,
  TextAlignLeft,
  User,
  UsersThree,
  Buildings,
  CalendarCheck,
  CalendarDots,
  GearSix,
  SoccerBall,
} from "@phosphor-icons/react";
import { useAuth } from "@/features/auth/AuthProvider";
import { useUserCapabilities } from "@/features/access/useUserCapabilities";
import { FloatingNotice } from "@/components/feedback/FloatingNotice";
import { apiRequest } from "@/lib/api";
import { LEGAL_VERSION } from "@/lib/legal";
type Me = {
  id: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  avatarUrl: string | null;
  status: string;
  onboardingStatus: string;
};
type Profile = {
  userId: string;
  homeDistrictCode: string | null;
  bio: string | null;
  preferredDisplayName: string | null;
  avatarUrl: string | null;
  visibility: string;
  onboardingStatus: string;
};
type CapabilityRequest = {
  id: string;
  capability: "MATCH_ORGANIZER" | "VENUE_OWNER";
  status: "PENDING" | "APPROVED" | "REJECTED" | "REVOKED";
  reason: string | null;
  createdAt: string;
  reviewedAt: string | null;
};
const capabilityOptions = [
  {
    capability: "MATCH_ORGANIZER" as const,
    title: "Organiza tu pichanga",
    description:
      "Crea partidos, completa cupos y gestiona a tus participantes desde un solo lugar.",
  },
  {
    capability: "VENUE_OWNER" as const,
    title: "Quiero alquilar mi cancha",
    description:
      "Publica tu complejo, gestiona horarios y recibe solicitudes de reserva.",
  },
];
const statusLabel: Record<CapabilityRequest["status"], string> = {
  PENDING: "Solicitud en revisión",
  APPROVED: "Solicitud aprobada",
  REJECTED: "Solicitud no aprobada",
  REVOKED: "Solicitud revocada",
};
export default function ProfilePage() {
  const { accessToken, loading, login, logout, setProfileAvatarUrl } =
    useAuth();
  const { capabilities } = useUserCapabilities();
  const [me, setMe] = useState<Me | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [capabilityRequests, setCapabilityRequests] = useState<
    CapabilityRequest[]
  >([]);
  const [requestReason, setRequestReason] = useState<Record<string, string>>(
    {},
  );
  const [requesting, setRequesting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [bioLength, setBioLength] = useState(0);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error" | "info">(
    "info",
  );
  useEffect(() => {
    if (!accessToken) return;
    apiRequest<Me>("/me", accessToken)
      .then(async (u) => {
        setMe(u);
        const loadedProfile = await apiRequest<Profile>(
          "/me/profile",
          accessToken,
        );
        setProfile(loadedProfile);
        setBioLength(loadedProfile.bio?.length ?? 0);
        setCapabilityRequests(
          await apiRequest<CapabilityRequest[]>(
            "/me/capability-requests",
            accessToken,
          ),
        );
      })
      .catch((e) => {
        setMessageTone("error");
        setMessage(e.message);
      });
  }, [accessToken]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;
    const form = new FormData(event.currentTarget);
    setMessage("");
    setSaving(true);
    try {
      const updated = await apiRequest<Profile>("/me/profile", accessToken, {
        method: "PATCH",
        body: JSON.stringify({
          homeDistrictCode: form.get("district"),
          bio: form.get("bio"),
          visibility: form.get("visibility"),
          preferredDisplayName: form.get("displayName"),
          termsVersion: form.get("accept") ? LEGAL_VERSION : "",
          privacyVersion: form.get("accept") ? LEGAL_VERSION : "",
        }),
      });
      setProfile(updated);
      setProfileAvatarUrl(updated.avatarUrl || me?.avatarUrl || null);
      setMessageTone("success");
      setMessage("Perfil actualizado.");
    } catch (e) {
      setMessageTone("error");
      setMessage(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }
  async function requestCapability(
    capability: CapabilityRequest["capability"],
  ) {
    if (!accessToken) return;
    setRequesting(capability);
    setMessage("");
    try {
      const request = await apiRequest<CapabilityRequest>(
        "/me/capability-requests",
        accessToken,
        {
          method: "POST",
          body: JSON.stringify({
            capability,
            reason: requestReason[capability] ?? "",
          }),
        },
      );
      setCapabilityRequests((current) => [
        request,
        ...current.filter((item) => item.id !== request.id),
      ]);
      window.dispatchEvent(new Event("pulso:capabilities-changed"));
      setMessageTone("success");
      setMessage(
        capability === "MATCH_ORGANIZER"
          ? "Ya puedes crear y gestionar tus pichangas."
          : "Recibimos tu solicitud. Te avisaremos cuando sea revisada.",
      );
    } catch (e) {
      setMessageTone("error");
      setMessage(
        e instanceof Error ? e.message : "No se pudo enviar la solicitud.",
      );
    } finally {
      setRequesting(null);
    }
  }
  if (loading)
    return (
      <main className="section">
        <h1>Cargando sesión…</h1>
      </main>
    );
  if (!accessToken)
    return (
      <main className="section">
        <p className="eyebrow">TU CUENTA</p>
        <h1>Ingresa para crear tu perfil</h1>
        <p>Protegemos tu identidad mediante un inicio de sesión seguro.</p>
        <div className="authActions">
          <button
            className={styles.primary}
            onClick={() => void login(false, "/perfil")}
            type="button"
          >
            Ingresar a Pulso Piura
          </button>
        </div>
      </main>
    );
  return (
    <main className={`section ${styles.page}`}>
      <section className={styles.hero} aria-label="Tu perfil deportivo">
        <div className={styles.identity}>
          <div
            className={styles.avatar}
            style={
              me?.avatarUrl || profile?.avatarUrl
                ? {
                    backgroundImage: `url(${me?.avatarUrl || profile?.avatarUrl})`,
                  }
                : undefined
            }
            aria-label="Foto de perfil"
          >
            {!(me?.avatarUrl || profile?.avatarUrl) &&
              (profile?.preferredDisplayName || me?.displayName || "J")
                .slice(0, 1)
                .toUpperCase()}
          </div>
          <div className={styles.identityText}>
            <p className="eyebrow">TU PERFIL DEPORTIVO</p>
            <h1>
              {profile?.preferredDisplayName || me?.displayName || "Jugador"}
            </h1>
            <p>{me?.email}</p>
          </div>
          <button className={styles.logout} type="button" onClick={logout}>
            <SignOut aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
        <nav className={styles.shortcuts} aria-label="Accesos de mi cuenta">
          <Link href="/actividad">
            <CalendarDots aria-hidden="true" size={21} />
            <span>
              <strong>Mi actividad</strong>
              <small>Partidos y reservas</small>
            </span>
            <CaretRight aria-hidden="true" className={styles.arrow} />
          </Link>
          {capabilities.canCreateMatches && (
            <Link href="/organizador">
              <SoccerBall aria-hidden="true" size={21} />
              <span>
                <strong>Mis pichangas</strong>
                <small>Publicaciones y jugadores</small>
              </span>
              <CaretRight aria-hidden="true" className={styles.arrow} />
            </Link>
          )}
          {capabilities.isVenueOwner && (
            <>
              <Link href="/organizaciones">
                <Buildings aria-hidden="true" size={21} />
                <span>
                  <strong>Mis canchas</strong>
                  <small>Crear complejo, canchas y horarios</small>
                </span>
                <CaretRight aria-hidden="true" className={styles.arrow} />
              </Link>
              <Link href="/organizaciones?create=1">
                <Buildings aria-hidden="true" size={21} />
                <span>
                  <strong>Crear complejo</strong>
                  <small>Registrar una nueva sede</small>
                </span>
                <CaretRight aria-hidden="true" className={styles.arrow} />
              </Link>
              <Link href="/reservas-cancha">
                <CalendarCheck aria-hidden="true" size={21} />
                <span>
                  <strong>Reservas</strong>
                  <small>Pagos y llegadas</small>
                </span>
                <CaretRight aria-hidden="true" className={styles.arrow} />
              </Link>
            </>
          )}
          {capabilities.canManagePlatform && (
            <Link href="/plataforma">
              <GearSix aria-hidden="true" size={21} />
              <span>
                <strong>Administración</strong>
                <small>Consola de plataforma</small>
              </span>
              <CaretRight aria-hidden="true" className={styles.arrow} />
            </Link>
          )}
        </nav>
      </section>
      {profile && (
        <form className={styles.form} onSubmit={save}>
          <header className={styles.sectionHeading}>
            <span className={styles.headingIcon}>
              <AddressBook aria-hidden="true" />
            </span>
            <div>
              <h2>Información del perfil</h2>
              <p>
                Mantén tu información actualizada para una mejor experiencia.
              </p>
            </div>
          </header>
          <div className={styles.fields}>
            <label>
              Nombre visible
              <span className={styles.input}>
                <User aria-hidden="true" />
                <input
                  name="displayName"
                  defaultValue={
                    profile.preferredDisplayName || me?.displayName || ""
                  }
                  maxLength={120}
                  autoComplete="name"
                  required
                />
              </span>
            </label>
            <label>
              Distrito (opcional)
              <span className={styles.input}>
                <MapPin aria-hidden="true" />
                <input
                  name="district"
                  defaultValue={profile.homeDistrictCode ?? ""}
                  maxLength={30}
                  placeholder="Ej. PIURA"
                />
              </span>
            </label>
            <label className={styles.bio}>
              Presentación
              <span className={styles.input}>
                <TextAlignLeft aria-hidden="true" />
                <textarea
                  name="bio"
                  defaultValue={profile.bio ?? ""}
                  onChange={(event) => setBioLength(event.target.value.length)}
                  maxLength={500}
                  placeholder="Cuéntanos qué deportes practicas"
                  aria-describedby="profile-bio-count"
                />
              </span>
              <small id="profile-bio-count" className={styles.counter}>
                {bioLength}/500
              </small>
            </label>
            <label>
              Visibilidad
              <span className={styles.input}>
                <Eye aria-hidden="true" />
                <select name="visibility" defaultValue={profile.visibility}>
                  <option value="PRIVATE">Privado</option>
                  <option value="PARTICIPANTS">Solo participantes</option>
                  <option value="PUBLIC">Público</option>
                </select>
              </span>
            </label>
          </div>
          <div className={styles.consent}>
            <ShieldCheck aria-hidden="true" />
            <label>
              <span>
                {profile.onboardingStatus === "COMPLETE"
                  ? "Actualizar mi aceptación (opcional): "
                  : ""}
                Acepto las{" "}
                <Link
                  href="/informacion/terminos"
                  target="_blank"
                  rel="noreferrer"
                >
                  condiciones de la demo
                </Link>{" "}
                y confirmo que leí el{" "}
                <Link
                  href="/informacion/privacidad"
                  target="_blank"
                  rel="noreferrer"
                >
                  aviso de privacidad
                </Link>
                .<small>No incluye consentimiento de publicidad.</small>
              </span>
              <input
                type="checkbox"
                name="accept"
                required={profile.onboardingStatus !== "COMPLETE"}
              />
            </label>
          </div>
          <button className={styles.primary} disabled={saving} type="submit">
            <FloppyDisk aria-hidden="true" />
            {saving ? "Guardando…" : "Guardar perfil"}
          </button>
        </form>
      )}
      {!profile && !message && (
        <p role="status">Cargando información del perfil…</p>
      )}
      <section
        className={styles.capabilities}
        id="capacidades"
        aria-labelledby="capability-title"
      >
        <p className="eyebrow">NUEVAS POSIBILIDADES</p>
        <h2 id="capability-title">También puedes darle forma al juego</h2>
        <p className={styles.lead}>
          Activa la organización de pichangas con tu correo verificado. Para
          publicar y administrar un complejo, nuestro equipo debe validar que
          representas al dueño de la cancha.
        </p>
        <div className={styles.capabilityGrid}>
          {capabilityOptions.map((option) => {
            const request = capabilityRequests.find(
              (item) => item.capability === option.capability,
            );
            const isPending = request?.status === "PENDING";
            const isOrganizer = option.capability === "MATCH_ORGANIZER";
            const canRequestOwner =
              !request ||
              request.status === "REJECTED" ||
              request.status === "REVOKED";
            const canActivateOrganizer =
              isOrganizer &&
              request?.status !== "APPROVED" &&
              request?.status !== "REVOKED";
            const requestLabel =
              canActivateOrganizer && request
                ? "Activación disponible"
                : request
                  ? statusLabel[request.status]
                  : "Disponible";
            return (
              <article
                className={styles.capabilityCard}
                key={option.capability}
              >
                <span className="pill">{requestLabel}</span>
                <div className={styles.capabilityHeading}>
                  <span className={styles.headingIcon}>
                    {isOrganizer ? (
                      <UsersThree aria-hidden="true" />
                    ) : (
                      <Buildings aria-hidden="true" />
                    )}
                  </span>
                  <div>
                    <h3>{option.title}</h3>
                    <p>{option.description}</p>
                  </div>
                </div>
                {canActivateOrganizer ? (
                  <>
                    <p className={styles.capabilityStatus}>
                      <CheckCircle aria-hidden="true" />
                      {me?.emailVerified
                        ? "Tu correo ya está verificado. La activación es inmediata."
                        : "Verifica tu correo para activar esta función."}
                    </p>
                    <button
                      className={styles.primary}
                      disabled={
                        !me?.emailVerified || requesting === option.capability
                      }
                      onClick={() => void requestCapability(option.capability)}
                      type="button"
                    >
                      {requesting === option.capability
                        ? "Activando…"
                        : "Activar organización"}
                      <CaretRight aria-hidden="true" />
                    </button>
                  </>
                ) : !isOrganizer && canRequestOwner ? (
                  <>
                    <label>
                      Cuéntanos brevemente
                      <textarea
                        className="resize-none"
                        value={requestReason[option.capability] ?? ""}
                        onChange={(event) =>
                          setRequestReason((current) => ({
                            ...current,
                            [option.capability]: event.target.value,
                          }))
                        }
                        aria-describedby="owner-request-count"
                        maxLength={1000}
                        placeholder="¿Qué te gustaría organizar o publicar?"
                      />
                      <small
                        id="owner-request-count"
                        className={styles.counter}
                      >
                        {(requestReason[option.capability] ?? "").length}/1000
                      </small>
                    </label>
                    <button
                      className={styles.primary}
                      disabled={requesting === option.capability}
                      onClick={() => void requestCapability(option.capability)}
                      type="button"
                    >
                      {requesting === option.capability
                        ? "Enviando…"
                        : "Solicitar acceso"}
                      <CaretRight aria-hidden="true" />
                    </button>
                  </>
                ) : (
                  <p className={styles.capabilityStatus}>
                    {request?.status === "REVOKED"
                      ? "Esta capacidad fue revocada. Contacta al soporte si necesitas una revisión."
                      : isPending
                        ? "Estamos revisando tu solicitud."
                        : "Esta capacidad está habilitada para tu cuenta."}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </section>
      <FloatingNotice
        message={message}
        onDismiss={() => setMessage("")}
        tone={messageTone}
      />
    </main>
  );
}
