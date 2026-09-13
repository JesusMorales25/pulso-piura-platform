"use client";

import { FormEvent, useState } from "react";
import {
  CalendarDots,
  CheckCircle,
  MapPin,
  UsersThree,
} from "@phosphor-icons/react";

export function DemoMatchBuilder() {
  const [created, setCreated] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreated(true);
  }

  return (
    <main className="section createMatchPage">
      <p className="eyebrow">CREAR PARTIDO</p>
      <h1>Organiza el próximo encuentro</h1>
      <p className="pageLead">
        Configura una primera vista del partido y compártela con tu grupo.
      </p>
      <div className="demoBanner" role="note">
        Formulario demostrativo: los datos no se guardan todavía en la base de
        datos.
      </div>
      {created ? (
        <div className="createSuccess">
          <CheckCircle aria-hidden="true" size={42} weight="fill" />
          <h2>Vista previa creada</h2>
          <p>
            El flujo visual funciona. La persistencia se conectará en la fase
            del módulo de partidos.
          </p>
          <button
            className="secondary"
            onClick={() => setCreated(false)}
            type="button"
          >
            Crear otro partido
          </button>
        </div>
      ) : (
        <form className="matchBuilderForm" noValidate onSubmit={submit}>
          <label>
            <span>Deporte</span>
            <select defaultValue="football">
              <option value="football">Fútbol 7</option>
              <option value="volleyball">Vóley</option>
              <option value="padel">Pádel</option>
            </select>
          </label>
          <label>
            <span>
              <MapPin aria-hidden="true" size={16} /> Zona o complejo
            </span>
            <input placeholder="Ej. Los Ejidos" required />
          </label>
          <div className="formPair">
            <label>
              <span>
                <CalendarDots aria-hidden="true" size={16} /> Fecha
              </span>
              <input required type="date" />
            </label>
            <label>
              <span>Hora</span>
              <input required type="time" />
            </label>
          </div>
          <div className="formPair">
            <label>
              <span>
                <UsersThree aria-hidden="true" size={16} /> Cupos
              </span>
              <input defaultValue="10" min="2" required type="number" />
            </label>
            <label>
              <span>Precio por persona</span>
              <input defaultValue="15" min="0" required type="number" />
            </label>
          </div>
          <label>
            <span>Nivel</span>
            <select defaultValue="intermediate">
              <option value="beginner">Principiante</option>
              <option value="intermediate">Intermedio</option>
              <option value="advanced">Avanzado</option>
            </select>
          </label>
          <button className="primary" type="submit">
            Crear vista previa
          </button>
        </form>
      )}
    </main>
  );
}
