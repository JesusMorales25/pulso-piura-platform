# 2. Actores y procesos

## Actores

| Actor | Responsabilidad principal | Necesidad |
|---|---|---|
| Visitante | Explorar oferta pública | Entender qué puede jugar |
| Jugador | Unirse y asistir | Cupo confiable y condiciones claras |
| Capitán | Crear y administrar partidos | Menos coordinación manual |
| Administrador de complejo | Gestionar espacios y reservas | Ocupación y control operativo |
| Organizador | Administrar campeonatos | Inscripciones, fixture y resultados |
| Operador de plataforma | Soporte y moderación | Visibilidad y trazabilidad |
| Administrador de plataforma | Configuración global | Gobierno, seguridad y métricas |

## Proceso principal: partido abierto

1. El capitán crea el partido.
2. Define deporte, modalidad, nivel, zona, fecha, costo y cupos.
3. Selecciona o solicita una cancha.
4. Comparte un enlace con su grupo.
5. Los jugadores confirman y registran su pago.
6. Los cupos restantes se publican para jugadores compatibles.
7. Una cancelación activa la lista de espera.
8. Al alcanzar el mínimo, el partido queda confirmado.
9. Después del partido se registra asistencia e incidencias.

## Proceso de reserva

1. El usuario consulta disponibilidad.
2. Selecciona cancha, fecha y franja.
3. El sistema calcula precio y adelanto.
4. El usuario inicia la reserva.
5. Se registra o valida el pago.
6. El sistema confirma y bloquea el horario.
7. Se envían recordatorios y reglas de cancelación.

## Proceso de mini campeonato

1. El organizador crea el torneo y su reglamento.
2. Define modalidad, cupos, fechas y costo.
3. Registra equipos y plantillas.
4. Controla inscripciones y pagos.
5. Genera o ajusta el fixture.
6. Registra resultados, sanciones y tabla.
7. Publica información mediante enlace.
8. Cierra el torneo y conserva el historial.

## Estados principales

### Partido

`BORRADOR → PUBLICADO → CUPO_MÍNIMO → CONFIRMADO → EN_CURSO → FINALIZADO`

Estados alternativos: `CANCELADO`, `REPROGRAMADO`.

### Reserva

`PENDIENTE → ESPERANDO_PAGO → CONFIRMADA → COMPLETADA`

Estados alternativos: `VENCIDA`, `CANCELADA`, `REEMBOLSADA`.

### Participación

`INVITADO → SOLICITADO → CONFIRMADO → ASISTIÓ`

Estados alternativos: `LISTA_ESPERA`, `CANCELÓ`, `AUSENTE`, `BLOQUEADO`.

## Reglas iniciales

- Un horario no puede tener dos reservas confirmadas.
- Un jugador no puede ocupar dos cupos en el mismo partido.
- El partido debe declarar mínimo y máximo de participantes.
- Las cancelaciones deben registrar fecha, motivo y responsable.
- Los cambios importantes generan notificación y auditoría.
- Los resultados de torneos solo pueden ser modificados por roles autorizados.

