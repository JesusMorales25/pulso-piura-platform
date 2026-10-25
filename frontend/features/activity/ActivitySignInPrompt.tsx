"use client";
import { CalendarCheck, SignIn, UsersThree } from "@phosphor-icons/react";
import { useAuth } from "@/features/auth/AuthProvider";
import styles from "./ActivitySignInPrompt.module.css";
export function ActivitySignInPrompt({
  type,
}: {
  type: "matches" | "reservations";
}) {
  const { login } = useAuth();
  const Icon = type === "matches" ? UsersThree : CalendarCheck;
  return (
    <section className={styles.prompt} aria-labelledby={`sign-in-${type}`}>
      <span className={styles.icon}>
        <Icon aria-hidden="true" weight="duotone" />
      </span>
      <h2 id={`sign-in-${type}`}>
        Inicia sesión para ver tus{" "}
        {type === "matches" ? "inscripciones" : "reservas"}
      </h2>
      <p>
        {type === "matches"
          ? "Aquí encontrarás los partidos a los que te uniste y el estado de tus inscripciones."
          : "Aquí encontrarás las canchas que reservaste y el estado de tus pagos."}
      </p>
      <button
        className="primary"
        type="button"
        onClick={() => void login(false, "/actividad")}
      >
        <SignIn aria-hidden="true" size={20} />
        Iniciar sesión
      </button>
    </section>
  );
}
