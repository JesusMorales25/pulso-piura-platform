"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/features/auth/AuthProvider";
import { FloatingNotice } from "@/components/feedback/FloatingNotice";
import { apiRequest } from "@/lib/api";
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
    title: "Quiero organizar partidos",
    description:
      "Publica partidos abiertos, completa cupos y coordina participantes desde un solo lugar.",
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
  const {
    accessToken,
    loading,
    login,
    logout,
    isPlatformAdmin,
    googleLoginEnabled,
    setProfileAvatarUrl,
  } = useAuth();
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
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error" | "info">(
    "info",
  );
  useEffect(() => {
    if (!accessToken) return;
    apiRequest<Me>("/me", accessToken)
      .then(async (u) => {
        setMe(u);
        setProfile(await apiRequest<Profile>("/me/profile", accessToken));
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
          termsVersion: form.get("accept") ? "2026-09" : "",
          privacyVersion: form.get("accept") ? "2026-09" : "",
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
      setCapabilityRequests((current) => [request, ...current]);
      setMessageTone("success");
      setMessage("Recibimos tu solicitud. Te avisaremos cuando sea revisada.");
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
        <p>Usamos Keycloak para proteger tu identidad.</p>
        <div className="authActions">
          {googleLoginEnabled && (
            <button
              className="primary borderless"
              onClick={() => void login(true)}
              type="button"
            >
              Continuar con Google
            </button>
          )}
          <button
            className={googleLoginEnabled ? "secondary" : "primary borderless"}
            onClick={() => void login(false)}
            type="button"
          >
            {googleLoginEnabled
              ? "Ingresar con otra opción"
              : "Iniciar sesión o registrarme"}
          </button>
        </div>
      </main>
    );
  return (
    <main className="section">
      <div className="profileHead">
        <div className="profileAvatar" style={(me?.avatarUrl || profile?.avatarUrl) ? { backgroundImage: `url(${me?.avatarUrl || profile?.avatarUrl})` } : undefined} aria-label="Foto de perfil">{!(me?.avatarUrl || profile?.avatarUrl) && (profile?.preferredDisplayName || me?.displayName || "J").slice(0,1).toUpperCase()}</div>
        <div>
          <p className="eyebrow">TU PERFIL DEPORTIVO</p>
          <h1>{profile?.preferredDisplayName || me?.displayName || "Jugador"}</h1>
          <p>{me?.email}</p>
        </div>
        <button className="secondary" onClick={logout}>
          Cerrar sesión
        </button>
      </div>
      {profile && (
        <form className="profileForm" noValidate onSubmit={save}>
          <label>
            Nombre visible
            <input name="displayName" defaultValue={profile.preferredDisplayName || me?.displayName || ""} maxLength={120} autoComplete="name" required />
          </label>
          <label>
            Distrito
            <input
              name="district"
              defaultValue={profile.homeDistrictCode ?? ""}
              maxLength={30}
              placeholder="Ej. PIURA"
              required
            />
          </label>
          <label>
            Presentación
            <textarea
              className="resize-none"
              name="bio"
              defaultValue={profile.bio ?? ""}
              maxLength={500}
              placeholder="Cuéntanos qué deportes practicas"
            />
          </label>
          <label>
            Visibilidad
            <select name="visibility" defaultValue={profile.visibility}>
              <option value="PRIVATE">Privado</option>
              <option value="PARTICIPANTS">Solo participantes</option>
              <option value="PUBLIC">Público</option>
            </select>
          </label>
          {profile.onboardingStatus !== "COMPLETE" && (
            <label className="check">
              <input type="checkbox" name="accept" required />
              Acepto los términos y la política de privacidad vigentes.
            </label>
          )}
          <button className="primary borderless" disabled={saving} type="submit">
            {saving ? "Guardando…" : "Guardar perfil"}
          </button>
        </form>
      )}
      {isPlatformAdmin && (
        <p className="platformLink">
          <Link className="secondary" href="/plataforma/solicitudes">
            Abrir consola de plataforma
          </Link>
        </p>
      )}
      <section className="capabilitySection" aria-labelledby="capability-title">
        <p className="eyebrow">NUEVAS POSIBILIDADES</p>
        <h2 id="capability-title">También puedes darle forma al juego</h2>
        <p className="pageLead">
          Solicita una capacidad y nuestro equipo revisará la información antes
          de habilitar las herramientas de gestión.
        </p>
        <div className="capabilityGrid">
          {capabilityOptions.map((option) => {
            const request = capabilityRequests.find(
              (item) => item.capability === option.capability,
            );
            const isPending = request?.status === "PENDING";
            const canRequest =
              !request ||
              request.status === "REJECTED" ||
              request.status === "REVOKED";
            return (
              <article className="capabilityCard" key={option.capability}>
                <span className="pill">
                  {request ? statusLabel[request.status] : "Disponible"}
                </span>
                <h3>{option.title}</h3>
                <p>{option.description}</p>
                {canRequest ? (
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
                        maxLength={1000}
                        placeholder="¿Qué te gustaría organizar o publicar?"
                      />
                    </label>
                    <button
                      className="primary borderless"
                      disabled={requesting === option.capability}
                      onClick={() => void requestCapability(option.capability)}
                      type="button"
                    >
                      {requesting === option.capability
                        ? "Enviando…"
                        : "Solicitar acceso"}
                    </button>
                  </>
                ) : (
                  <p className="capabilityStatus">
                    {isPending
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
