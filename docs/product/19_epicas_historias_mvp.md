# 19. Épicas e historias del MVP

## Priorización

- `P0`: imprescindible para piloto técnico.
- `P1`: imprescindible para MVP usable.
- `P2`: posterior a validación o beta.

## EP-01 — Identidad y onboarding

### US-001 — Continuar con Google (`P0`)

Como visitante, quiero registrarme o iniciar sesión con Google para acceder sin crear otra contraseña.

Aceptación:

- Google se integra mediante Keycloak;
- Spring Boot acepta solo tokens de Keycloak;
- primer acceso crea un único `user` por `identity_subject`;
- no concede roles organizacionales;
- scopes limitados a identidad;
- rechazo/cancelación no crea cuentas parciales.

### US-002 — Completar perfil (`P0`)

Como jugador nuevo, quiero indicar nombre visible, zona y deportes para participar en actividades compatibles.

### US-003 — Gestionar cuentas conectadas (`P2`)

Como usuario, quiero vincular o desvincular Google de forma segura.

## EP-02 — Organizaciones y acceso

### US-010 — Crear organización (`P1`)

Como operador autorizado, quiero registrar un complejo para administrar sus sedes.

### US-011 — Invitar administrador (`P1`)

Como propietario, quiero invitar personal y asignar roles dentro de mi organización.

### US-012 — Revocar membresía (`P1`)

Como administrador, quiero suspender acceso inmediatamente y conservar auditoría.

## EP-03 — Sedes y espacios

### US-020 — Registrar sede y cancha (`P1`)

Como administrador de complejo, quiero definir sedes, espacios, deportes y capacidades.

### US-021 — Configurar horarios y precios (`P1`)

Como administrador, quiero configurar disponibilidad regular y excepciones.

### US-022 — Explorar espacios (`P1`)

Como jugador, quiero consultar espacios públicos por zona, deporte y fecha.

### US-023 — Consultar características del espacio (`P1`)

Como jugador, quiero filtrar por modalidad, superficie y amenidades para elegir una cancha adecuada.

## EP-04 — Reservas

### US-030 — Consultar disponibilidad (`P0`)

Como usuario, quiero conocer horarios disponibles calculados sin ver reservas privadas.

### US-031 — Crear reserva temporal (`P0`)

Como usuario, quiero retener un horario durante un periodo corto mientras confirmo.

Aceptación crítica:

- no permite solapamiento;
- dos solicitudes concurrentes producen una ganadora y un 409;
- reintento idempotente devuelve el mismo resultado;
- expiración libera el horario.

### US-032 — Confirmar/cancelar reserva (`P1`)

Como usuario u operador autorizado, quiero confirmar o cancelar según política.

### US-033 — Crear reserva recurrente (`P2`)

Como cliente habitual, quiero solicitar una serie semanal y conocer qué ocurrencias presentan conflicto.

### US-034 — Consultar historial (`P1`)

Como jugador u operador, quiero consultar reservas pasadas, activas y canceladas dentro de mi alcance.

### US-035 — Validar pase QR (`P2`)

Como recepcionista, quiero validar un pase opaco para registrar check-in sin exponer datos financieros.

## EP-05 — Partidos y cupos

### US-040 — Crear partido (`P0`)

Como capitán, quiero publicar deporte, fecha, nivel, ubicación, precio y cupos.

### US-041 — Compartir partido (`P0`)

Como capitán, quiero obtener un enlace para compartir por WhatsApp.

### US-042 — Unirse a un partido (`P0`)

Como jugador, quiero reservar un cupo sin exceder el máximo.

### US-043 — Lista de espera (`P1`)

Como jugador, quiero entrar a una cola cuando el partido esté completo.

### US-044 — Reemplazo por cancelación (`P1`)

Como capitán, quiero promover al siguiente jugador de forma consistente.

### US-045 — Registrar asistencia (`P1`)

Como capitán, quiero registrar asistencia, cancelación o ausencia.

### US-046 — Resolver quórum (`P1`)

Como capitán y jugador, quiero que el partido confirme o cancele de forma consistente al llegar el plazo.

## EP-06 — Pagos operativos

### US-050 — Registrar estado de cuota (`P1`)

Como capitán/operador, quiero marcar una cuota pendiente, en verificación o pagada.

### US-051 — Cargar evidencia (`P2`)

Como jugador, quiero adjuntar evidencia sin que la captura confirme automáticamente el pago.

### US-052 — Integrar proveedor (`P2`)

Como producto, quiero recibir webhooks firmados e idempotentes.

## EP-07 — Mini campeonatos

### US-060 — Crear torneo (`P1 condicionado`)

Como organizador, quiero definir modalidad, equipos, fechas y reglas.

### US-061 — Registrar equipos y plantillas (`P1 condicionado`)

### US-062 — Crear fixture (`P2`)

### US-063 — Registrar y aprobar resultado (`P2`)

## EP-08 — Notificaciones

### US-070 — Recordatorio de partido (`P1`)

### US-071 — Aviso de cupo/reemplazo (`P1`)

### US-072 — Notificación de reserva (`P1`)

Los reintentos deben ser idempotentes y no duplicar mensajes excesivamente.

## EP-09 — Moderación y auditoría

### US-080 — Reportar usuario/partido (`P1`)

### US-081 — Resolver reporte (`P1`)

### US-082 — Consultar auditoría autorizada (`P1`)

## EP-10 — Operación y promociones

### US-090 — Consultar indicadores operativos (`P2`)

Como propietario, quiero ver ocupación, ingreso bruto y demanda por cancha y franja.

### US-091 — Exportar operación (`P2`)

Como administrador autorizado, quiero exportar datos filtrados con registro de auditoría.

### US-092 — Configurar promoción (`P2`)

Como administrador, quiero crear un cupón o beneficio acotado sin alterar el historial de precios.

## EP-11 — Fidelización e integraciones

### US-100 — Consultar clientes derivados (`P2`)

Como administrador, quiero consultar actividad de clientes de mi organización sin copiar perfiles globales.

### US-101 — Gestionar consentimiento de marketing (`P2`)

Como jugador, quiero aceptar o retirar comunicaciones promocionales por finalidad y canal.

### US-102 — Añadir reserva al calendario (`P2`)

Como jugador, quiero exportar un evento ICS o conectar Google Calendar de forma revocable.

## EP-12 — Comercios aliados (`P2 condicionado`)

### US-110 — Gestionar campaña local

Como operador autorizado, quiero configurar comercio, vigencia, beneficio, ubicación y enlace permitido.

### US-111 — Consultar recomendación post-partido

Como jugador, quiero ver recomendaciones opcionales y abrir enlaces externos de forma segura.

### US-112 — Consultar rendimiento agregado

Como responsable comercial, quiero ver clics válidos, vigencia y estado de cobro sin perfilar jugadores.

## Orden funcional recomendado

1. US-001, US-002.
2. US-010, US-011, US-012.
3. US-020, US-021.
4. US-030, US-031.
5. US-040, US-041, US-042.
6. US-032, US-043, US-044, US-045.
7. US-050 y notificaciones.
8. Moderación/auditoría.
9. Torneos según resultados de encuesta.
10. Reservas recurrentes, historial, QR y reportes después de estabilizar la reserva simple.
11. CRM, calendario, promociones y comercios aliados únicamente con validación y consentimiento.
