# 37. Plan de pruebas de usabilidad del prototipo

## Objetivo

Comprobar si jugadores y responsables de complejos entienden la propuesta, encuentran un partido, identifican sus condiciones y completan una reserva simulada sin ayuda. Estas pruebas validan experiencia y requisitos; no validan pagos ni infraestructura reales.

## Participantes

Primera ronda recomendada: 8–10 personas.

| Perfil | Cantidad | Criterio |
|---|---:|---|
| Jugador frecuente | 3 | juega al menos semanalmente |
| Jugador ocasional | 2 | dificultad para formar equipo o encontrar cancha |
| Capitán/organizador informal | 2 | coordina por WhatsApp y cobra adelantos |
| Responsable de complejo | 2–3 | administra horarios, reservas o cobros |

No reclutar únicamente amistades del equipo creador. Procurar diversidad de edad, zona, deporte y familiaridad digital.

## Modalidad

- sesión moderada individual de 20–25 minutos;
- celular propio del participante, preferentemente;
- prototipo web compartido por URL;
- facilitador no explica la interfaz;
- observador registra tiempo, errores y comentarios textuales;
- solicitar consentimiento antes de grabar pantalla o audio.

## Introducción del facilitador

> Estamos evaluando una idea y su interfaz, no tu capacidad. Algunas funciones son simuladas y no se realizará ningún cobro. Piensa en voz alta. Si algo no se entiende, cuéntanos qué esperabas encontrar.

## Tareas para jugadores

### Tarea 1 — Comprender la propuesta

“Acabas de recibir este enlace por WhatsApp. Sin tocar nada todavía, dime qué crees que puedes hacer aquí.”

Observar si menciona partidos, cupos, personas, canchas y reserva.

### Tarea 2 — Evaluar un partido

“Quieres jugar fútbol el sábado por la noche. Averigua dónde es, cuánto cuesta, qué nivel tiene y cuántos cupos quedan.”

Éxito: identifica Los Ejidos, S/15, intermedio y 3 cupos sin ayuda.

### Tarea 3 — Reservar con Plin

“Decide si te conviene y reserva un cupo usando Plin.”

Éxito: llega a confirmación, comprende el estado `Verificando` y no cree que hubo cobro real.

### Tarea 4 — Recuperar la reserva

“¿Dónde buscarías luego los datos de tu partido?”

Éxito: encuentra `Mi actividad`.

## Tareas para complejos

1. explicar qué información del partido genera confianza o falta;
2. identificar quién cobra y cómo se comprobaría el pago;
3. señalar datos necesarios antes de confirmar una reserva;
4. describir qué necesitaría su panel operativo;
5. indicar si aceptaría un piloto y bajo qué condiciones.

## Preguntas posteriores

1. ¿Qué entendiste que resuelve la plataforma?
2. ¿Qué dato te dio más confianza?
3. ¿Qué parte te generó duda?
4. ¿Entendiste cuándo la reserva estaba realmente confirmada?
5. ¿Preferirías Yape, Plin u otro medio?
6. ¿Qué funcionalidad faltaría para que la uses?
7. Del 1 al 5, ¿qué tan fácil fue completar la tarea?
8. Del 0 al 10, ¿qué tan probable sería que la uses o recomiendes?

## Métricas y criterios

| Métrica | Meta para avanzar |
|---|---:|
| Comprende propuesta sin explicación | ≥80% |
| Completa reserva sin ayuda | ≥80% |
| Identifica precio y cupos | ≥90% |
| Distingue verificando/confirmado | 100% |
| Tiempo mediano hasta CTA | ≤30 s |
| Facilidad promedio | ≥4/5 |
| Errores críticos | 0 |

## Registro de hallazgos

| ID | Perfil | Tarea | Evidencia observada | Severidad | Recomendación |
|---|---|---|---|---|---|
| UX-001 | | | | crítica/alta/media/baja | |

Una opinión aislada se registra; un cambio de alcance se prioriza solo si está alineado con la visión, se repite o mitiga un riesgo relevante.

## Decisión después de la ronda

- **Avanzar:** metas cumplidas y sin hallazgos críticos.
- **Corregir y repetir:** falla una meta clave o hay confusión de pago/reserva.
- **Revisar propuesta:** menos de 60% comprende el valor principal.

El informe de la ronda debe cerrar con resultados, evidencia, cambios aceptados, cambios rechazados y versión del prototipo evaluada.
