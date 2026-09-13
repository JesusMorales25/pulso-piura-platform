# Iteración 5 — Partidos abiertos

**Estado:** bloques 5A y 5B implementados; pendiente reiniciar el backend local para aplicar `V15` y completar la validación HTTP de extremo a extremo.

## Objetivo

Permitir que una persona organice y publique un partido sobre una reserva propia confirmada, lo
comparta mediante un enlace estable y gestione cupos sin exceder la capacidad. El módulo `matches`
consume contratos públicos de `reservations` y `venues`; no accede a sus repositorios.

## Cortes verticales

### 5A — Creación y publicación

**Implementado en backend:** migraciones `V13` y `V14`, dominio, persistencia, servicio de
aplicación, API pública/autenticada y auditoría. Flyway validó las 15 migraciones y Hibernate
validó el esquema real en PostgreSQL. El empaquetado Maven sin pruebas se completó correctamente.

- crear borrador únicamente desde una reserva confirmada, futura y propiedad del organizador;
- derivar cancha, organización, fecha y deporte en backend;
- validar título, nivel, mínimo, máximo, costo, visibilidad y política de cancelación;
- publicar con identificador público no secuencial;
- catálogo público sin correo, teléfono ni otros datos privados;
- auditoría de creación y publicación.

### 5B — Participantes y concurrencia

**Implementado en backend y conectado con el frontend.** La migración `V15` incorpora
participaciones aisladas por organización, unicidad por persona y partido, lista de espera y
orden FIFO. Las mutaciones bloquean el partido antes de calcular la capacidad, por lo que dos
solicitudes concurrentes no pueden adjudicarse el mismo último cupo.

- unirse o retirarse idempotentemente;
- impedir dos cupos activos de una persona en el mismo partido;
- bloquear el partido al decidir cupo/lista de espera;
- promoción FIFO auditable al liberarse un cupo;
- ocupación real en catálogo y detalle.

### 5C — Operación

- edición compatible con participantes existentes;
- confirmación, reprogramación y cancelación;
- asistencia y cierre;
- enlace para compartir por WhatsApp sin exponer datos personales.

## Reglas de seguridad de 5A

1. No se acepta `organizationId`, `sportSpaceId`, fecha ni deporte desde el cliente.
2. La reserva vinculada debe pertenecer al actor y estar `CONFIRMED`.
3. La capacidad máxima no puede superar la capacidad publicada de la cancha.
4. Borradores solo son visibles para su organizador; el catálogo solo devuelve `PUBLISHED`.
5. El enlace público usa un slug aleatorio y no constituye autorización para acciones privadas.

## API inicial

| Método | Ruta | Acceso | Uso |
|---|---|---|---|
| `POST` | `/api/v1/matches` | autenticado | crear borrador |
| `POST` | `/api/v1/matches/{id}/publish` | organizador | publicar |
| `GET` | `/api/v1/matches` | público | buscar publicados futuros |
| `GET` | `/api/v1/matches/{publicSlug}` | público | detalle publicado |
| `POST` | `/api/v1/matches/{publicSlug}/participants/me` | autenticado | unirse o entrar a lista de espera |
| `DELETE` | `/api/v1/matches/{publicSlug}/participants/me` | autenticado | retirarse y promover al siguiente |

## Integración web de 5B

- el inicio consume el catálogo real y muestra ocupación, cancha, dirección, hora y precio;
- `Unirme` exige sesión y persiste la participación en backend;
- la vista de detalle permite unirse y retirarse sin duplicar cupos;
- reservar cancha conserva fecha y complejo al abrir el flujo de reserva real existente;
- el selector principal mantiene siempre el orden `Encontrar partido` / `Reservar cancha` y solo
  cambia el estado activo, el banner y el contenido.
