# Iteración 4 — Reservas simples y prevención de conflictos

**Estado:** bloques 4A–4D implementados; cierre 4E y E2E concurrente pendientes  
**Condición de inicio:** cerrar el E2E de la Iteración 3 con `V8` y `V9` aplicadas.

## 1. Objetivo

Permitir que un usuario autenticado bloquee y confirme una franja real sin que dos operaciones
puedan reservar la misma cancha al mismo tiempo. La disponibilidad pública de esta iteración dejará
de ser solo teórica y descontará holds y reservas bloqueantes.

No incluye cobro por Yape, Plin, QR, recurrencia, check-in ni partidos. Esas capacidades consumirán
el agregado de reserva una vez que sus invariantes estén verificadas.

## 2. Decisiones obligatorias

- `reservations` será un módulo propio y solo consumirá APIs públicas de `venues`, `identity` y
  `organizations`; nunca sus repositorios.
- La organización y el precio se resolverán en backend desde la cancha y el slot solicitado.
- Fechas de reserva, vencimiento e historial se persistirán como instantes UTC.
- Importes se guardarán como enteros en céntimos y moneda `PEN`.
- Toda creación exigirá `Idempotency-Key`; una misma clave con otro payload devolverá conflicto.
- PostgreSQL será la última barrera contra solapamientos mediante una exclusión sobre rangos `[)`.
- Un hold durará inicialmente 10 minutos como valor configurable de plataforma. Sigue siendo una
  hipótesis y no una regla comercial definitiva.
- Mientras no exista integración de pagos, el cliente solo podrá confirmar reservas sin adelanto.
  No se aceptarán capturas de Yape o Plin como confirmación automática.
- El frontend no enviará precios, tenant, estado confirmado ni vencimiento.

## 3. Estados del agregado

```text
HOLD ───────────────► CONFIRMED ─► COMPLETED
  ├─► EXPIRED
  └─► CANCELLED

PENDING_PAYMENT se habilitará cuando el módulo payments exista.
CONFIRMED ─► CANCELLED solo bajo una política visible y auditable.
```

Estados bloqueantes: `HOLD`, `PENDING_PAYMENT` y `CONFIRMED`. Antes de insertar un nuevo hold se
expirarán, dentro de la misma transacción, los holds vencidos de la cancha afectada.

## 4. Modelo físico propuesto

### `app.reservations`

| Campo | Regla |
|---|---|
| `id` | UUID generado por servidor |
| `organization_id` | derivado de la cancha; FK compuesta de tenant |
| `sport_space_id` | cancha publicada |
| `customer_user_id` | usuario local autenticado |
| `starts_at`, `ends_at` | rango UTC semiabierto `[)` |
| `status` | estado explícito con constraint |
| `total_minor`, `deposit_minor`, `currency` | cálculo backend; `0 <= deposit <= total`, `PEN` |
| `expires_at` | obligatorio únicamente en `HOLD` |
| `idempotency_key` | obligatorio, máximo 100 caracteres |
| `request_fingerprint` | hash de los campos semánticos de la solicitud |
| `created_at`, `updated_at`, `version` | auditoría técnica y control optimista |

Constraints:

1. `ends_at > starts_at`;
2. clave única `(customer_user_id, idempotency_key)`, porque la clave es obligatoria;
3. FK `(organization_id, sport_space_id)` hacia la cancha del mismo tenant;
4. exclusión GiST por `sport_space_id` y `tstzrange(starts_at, ends_at, '[)')` para estados
   bloqueantes;
5. índices por cliente, organización, cancha/fecha, estado y vencimiento;
6. `btree_gist` se declarará en migración y como requisito de infraestructura administrada.

### `app.reservation_status_history`

Registro inmutable con reserva, estado anterior/nuevo, actor, instante, motivo/código y correlation
ID. No se actualiza ni elimina desde los casos de uso.

## 5. API objetivo

| Método | Ruta | Autenticación | Resultado |
|---|---|---|---|
| GET | `/spaces/{spaceId}/bookable-slots?date=` | pública | slots teóricos menos rangos bloqueantes |
| POST | `/reservations` | usuario | crea o recupera idempotentemente un hold |
| GET | `/reservations/{reservationId}` | propietario u organización | detalle permitido |
| GET | `/me/reservations` | usuario | historial propio paginado |
| POST | `/reservations/{reservationId}/confirm` | propietario sin adelanto u organización autorizada | confirma si el hold sigue vigente |
| POST | `/reservations/{reservationId}/cancel` | propietario u organización según política | cancela sin borrar historial |

`POST /reservations` recibirá únicamente `sportSpaceId`, `startsAt` y `endsAt`, además de la
cabecera `Idempotency-Key`. El backend verificará que corresponda exactamente a un slot vigente.

Errores contractuales:

- `400`: rango, clave o formato inválido;
- `401`: ausencia/token inválido;
- `403`: actor sin derecho a leer o transicionar;
- `404`: recurso no visible;
- `409 reservation-conflict`: franja ocupada, hold vencido, transición o reintento incompatible;
- `422 slot-not-bookable`: la franja no pertenece a la configuración vigente.

## 6. Límites y puertos entre módulos

`venues` expondrá una consulta de solo lectura que valida cancha publicada y devuelve los slots
teóricos con organización, precio y zona horaria. `reservations` combinará esa respuesta con sus
rangos bloqueantes y será dueño del endpoint `bookable-slots`.

El flujo evita que `venues` dependa de `reservations`:

```text
frontend → reservations → VenueAvailabilityQuery (API pública de venues)
                         → ReservationRepository
                         → PostgreSQL exclusion constraint
```

Las notificaciones y pagos futuros consumirán eventos; no formarán parte de la transacción de
creación.

## 7. Seguridad y privacidad

- autenticación OIDC obligatoria para mutaciones e historial;
- autorización por propiedad o membresía contextual, evaluada en application service;
- respuestas públicas sin usuario, correo, teléfono ni idempotency key;
- detalle propio separado de vistas administrativas;
- tenant derivado y validado en servidor;
- errores equivalentes para recurso inexistente o no autorizado cuando eviten enumeración;
- eventos de auditoría sin tokens, payload completo ni datos de pago;
- rate limiting de creación antes de piloto público;
- expiración y cancelación idempotentes.

## 8. Concurrencia e idempotencia

Orden transaccional de creación:

1. normalizar actor y `Idempotency-Key`;
2. buscar una reserva previa del actor por esa clave;
3. devolverla si el fingerprint coincide; devolver `409` si difiere;
4. obtener y validar el slot teórico desde `venues`;
5. expirar holds vencidos que afecten la cancha;
6. intentar insertar el rango bloqueante;
7. traducir violación de exclusión a `409 reservation-conflict`;
8. insertar historial y auditoría;
9. confirmar la transacción antes de publicar eventos.

La corrección no dependerá de una consulta previa de disponibilidad: esa consulta mejora la UX,
pero la exclusión en base de datos resuelve la carrera final.

## 9. Bloques de implementación

### 4A — Dominio y persistencia

- migración incremental `V10`;
- agregado, estados, transiciones y repositorios;
- constraints, índices e historial;
- reloj inyectable y configuración tipada del hold.

#### Entrega 4A — 2026-09-04

- migración `V10` con reservas, historial inmutable, claves de tenant e índices operativos;
- exclusión GiST que impide rangos bloqueantes superpuestos y permite rangos adyacentes `[)`;
- clave idempotente obligatoria por cliente y fingerprint de solicitud validado;
- dominio independiente de Spring/JPA con rango temporal, dinero PEN, estado y transiciones;
- confirmación sin pago limitada a holds vigentes con adelanto cero;
- cancelación y expiración idempotentes;
- puertos pequeños para reserva e historial, con adaptadores JPA separados;
- historial expuesto únicamente mediante una operación `append`, sin borrado desde aplicación;
- duración del hold configurable mediante `RESERVATION_HOLD_DURATION`, por defecto `PT10M`;
- siete pruebas unitarias aprobadas y compilación del backend satisfactoria.

`V10` todavía no se marca como aplicada porque la infraestructura local quedó pendiente de
validación por el responsable del producto. El siguiente bloque no debe asumir que el constraint
GiST funciona hasta ejecutar una prueba concurrente contra PostgreSQL real.

### 4B — Creación segura

- puerto de disponibilidad teórica desde `venues`;
- creación idempotente;
- traducción profesional de conflictos;
- auditoría de creación y expiración;
- pruebas concurrentes con PostgreSQL real.

#### Entrega 4B — 2026-09-04

- contrato público `VenueSlotQuoteQuery` para consumir una franja exacta sin acceder a repositorios
  de `venues`;
- `POST /api/v1/reservations` autenticado, con `Idempotency-Key` obligatoria;
- organización, moneda, precio y vencimiento derivados exclusivamente en backend;
- reintento con la misma clave y fingerprint devuelve la reserva previa; payload distinto produce
  `409`;
- franja pasada o ajena a la configuración vigente produce `422`;
- expiración de holds solapados bajo bloqueo pesimista antes de insertar;
- transacción independiente para que un conflicto de constraint pueda traducirse sin continuar una
  transacción marcada para rollback;
- historial de creación por `USER` y expiración automática por `SYSTEM`;
- errores de reserva diferenciados mediante Problem Details;
- OpenAPI `0.4.0` actualizado;
- once pruebas de creación, reintento, conflicto, expiración y cotización aprobadas sin fallos.

La prueba concurrente del constraint GiST y la aplicación real de `V10` siguen pendientes porque
Docker no está disponible en el entorno de ejecución actual. No se atribuye un resultado ficticio.

### 4C — Consulta, confirmación y cancelación

- detalle propio/contextual e historial paginado;
- confirmación válida solo antes de vencer;
- cancelación idempotente y motivos controlados;
- permisos OWNER/ADMIN/OPERATOR y propiedad del cliente.

### 4D — Disponibilidad reservable y frontend

- endpoint público `bookable-slots`;
- selector de slot y resumen de reserva mobile-first;
- login diferido hasta pulsar reservar;
- cuenta regresiva accesible para el hold;
- estados de conflicto, vencimiento, reintento y éxito;
- ningún mensaje afirmará que existe pago real.

#### Entrega 4C–4D — 2026-09-05

- lectura de detalle protegida por propiedad o permiso contextual, ocultando recursos ajenos;
- historial propio paginado en `GET /me/reservations`;
- confirmación y cancelación idempotentes bajo bloqueo pesimista e historial inmutable;
- expiración persistida antes de responder conflicto al intentar confirmar un hold vencido;
- disponibilidad pública real que descuenta holds vigentes y estados bloqueantes;
- flujo web mobile-first con login diferido, creación de hold, cuenta regresiva y resumen;
- pantalla Actividad conectada al historial propio;
- OpenAPI elevado a `0.5.0`, sin exponer tenant, claves idempotentes ni datos personales;
- frontend aprobado por lint, TypeScript y build de producción; backend compilado correctamente.

La suite Maven completa quedó temporalmente bloqueada por procesos Java externos que conservan
archivos de `backend/target` en Windows. No se da por aprobado el E2E ni el constraint concurrente
hasta limpiar ese directorio y ejecutar el cierre 4E.

### 4E — Cierre

- OpenAPI, modelo de amenazas y documentación actualizados;
- E2E de dos usuarios compitiendo por la misma franja;
- pruebas de otro tenant y enumeración;
- prueba a 360 px, teclado y contraste;
- demostración con una cancha publicada.

#### Avance de cierre — 2026-09-05

- añadidas pruebas unitarias de transición, expiración, disponibilidad y aislamiento por
  propiedad/tenant;
- añadido `validate-iteration-4.ps1` para comprobar rutas públicas, protección sin token y
  presencia del constraint GiST;
- añadido `validate-reservation-concurrency.ps1`, que ejecuta dos transacciones PostgreSQL
  concurrentes, exige un único ganador y elimina la data temporal;
- `spring.jpa.open-in-view` desactivado para mantener el acceso a persistencia dentro de los casos
  de uso transaccionales;
- ambos scripts PowerShell superan validación sintáctica y el código principal continúa
  compilando.

Pendiente de aprobación: ejecutar ambos scripts con el backend 0.5.0 reiniciado y Docker accesible,
completar el recorrido autenticado en navegador y revisar el layout a 360 px. El bloqueo conocido
de `testCompile` por el classpath/`target` local continúa documentado y no se oculta como éxito.

## 10. Matriz mínima de pruebas

| Caso | Resultado esperado |
|---|---|
| dos solicitudes concurrentes al mismo rango | una crea; otra recibe `409` |
| rangos adyacentes | ambos válidos por semántica `[)` |
| misma clave y mismo payload | misma reserva, sin historial duplicado |
| misma clave y payload distinto | `409` |
| slot fuera de regla o cerrado | `422` |
| hold vencido | no confirma; se libera idempotentemente |
| cancha/sede borrador | no reservable |
| usuario consulta reserva ajena | no obtiene datos |
| miembro de otro tenant | no obtiene acceso administrativo |
| precio manipulado en frontend | no tiene efecto; backend recalcula |

## 11. Criterio de cierre

La iteración termina cuando dos clientes concurrentes no pueden confirmar la misma franja, un
reintento no crea duplicados, un hold vencido se libera de forma segura, los slots públicos
descuentan rangos bloqueantes y cada lectura respeta propiedad o tenant.

## 12. Deuda no bloqueante

- pagos Yape/Plin y webhook;
- reservas recurrentes, QR, check-in y reprogramación;
- políticas comerciales definitivas de adelanto/cancelación;
- trabajos distribuidos y rate limiting compartido;
- caché de disponibilidad, solo después de medir.
