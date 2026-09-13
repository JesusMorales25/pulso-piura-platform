# 11. Matriz de roles y permisos

## Principio

Los roles facilitan la administración; los permisos autorizan acciones. La pertenencia a una organización limita el ámbito del permiso.

## Roles globales

| Rol              | Propósito                                       |
| ---------------- | ----------------------------------------------- |
| `PLATFORM_ADMIN` | configuración global, nunca operación rutinaria |
| `SUPPORT_AGENT`  | soporte limitado y auditado                     |
| `MODERATOR`      | tratamiento de reportes y conducta              |

## Roles de organización

| Rol                    | Propósito                                 |
| ---------------------- | ----------------------------------------- |
| `ORG_OWNER`            | responsable principal de la organización  |
| `ORG_ADMIN`            | usuarios, sedes, configuración y reportes |
| `VENUE_MANAGER`        | canchas, disponibilidad y reservas        |
| `RECEPTIONIST`         | reservas, asistencia y cobros operativos  |
| `TOURNAMENT_ORGANIZER` | campeonatos asignados                     |
| `TEAM_DELEGATE`        | plantilla e inscripciones de su equipo    |

## Roles/relaciones del dominio

`PLAYER` y `CAPTAIN` se tratarán principalmente como relaciones del dominio. Una persona es capitán de determinados partidos, no necesariamente de toda la plataforma.

## Catálogo inicial de permisos

| Dominio       | Permisos                                                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------------------------- |
| Perfil        | `profile:read:self`, `profile:update:self`, `profile:moderate`                                                   |
| Organización  | `org:read`, `org:update`, `membership:read`, `membership:manage`                                                 |
| Sedes         | `venue:read`, `venue:create`, `venue:update`, `venue:archive`                                                    |
| Reservas      | `reservation:read`, `reservation:create`, `reservation:update`, `reservation:cancel`, `reservation:override`     |
| Partidos      | `match:read`, `match:create`, `match:update:own`, `match:manage`, `match:moderate`                               |
| Participantes | `participant:join`, `participant:leave`, `participant:manage`, `attendance:record`                               |
| Pagos         | `payment:read:self`, `payment:read:org`, `payment:record`, `payment:reconcile`, `payment:refund`                 |
| Torneos       | `tournament:read`, `tournament:create`, `tournament:update`, `fixture:manage`, `result:record`, `result:approve` |
| Moderación    | `report:create`, `report:read`, `report:resolve`, `user:suspend`                                                 |
| Plataforma    | `platform:configure`, `audit:read`, `data:export`                                                                |

## Matriz resumida

| Acción                   | Jugador | Capitán propio | Recepción |   Org Admin   | Organizador | Soporte  | Platform Admin |
| ------------------------ | :-----: | :------------: | :-------: | :-----------: | :---------: | :------: | :------------: |
| Ver perfil propio        |   Sí    |       Sí       |    Sí     |      Sí       |     Sí      | Limitado |       Sí       |
| Actualizar perfil propio |   Sí    |       Sí       |    Sí     |      Sí       |     Sí      |    No    |       No       |
| Crear partido            |   Sí    |       Sí       |  Config.  |    Config.    |     Sí      |    No    |       No       |
| Gestionar participantes  |   No    |       Sí       |  Config.  |      Sí       |  En evento  |    No    |       No       |
| Crear reserva            |   Sí    |       Sí       |    Sí     |      Sí       |     Sí      |    No    |       No       |
| Sobrescribir reserva     |   No    |       No       |    No     |  Restringido  |     No      |    No    |   Emergencia   |
| Registrar pago           | Propio  |     Propio     |    Sí     |      Sí       |  En evento  |    No    |       No       |
| Reembolsar               |   No    |       No       |    No     |  Con control  | Con control |    No    |   Emergencia   |
| Gestionar sedes          |   No    |       No       |  Lectura  |      Sí       |     No      |    No    |       No       |
| Resolver reporte         |   No    |       No       |    No     | Propio ámbito |   Evento    |    Sí    |       Sí       |
| Ver auditoría            | Propia  |     Propia     |    No     | Organización  |   Evento    | Limitada |       Sí       |

`Config.` significa habilitable por política de la organización. `Emergencia` exige justificación y auditoría reforzada.

## Navegación y opciones visibles

La interfaz se deriva de capacidades y relaciones vigentes; no muestra todas las funciones a todas las cuentas. Esta visibilidad mejora la experiencia, pero no sustituye la autorización del backend.

| Contexto del usuario      | Navegación principal                         | Acciones disponibles                                                               |
| ------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------- |
| Visitante                 | Inicio, explorar y perfil/acceso             | Consultar canchas y partidos públicos; iniciar sesión antes de reservar o unirse   |
| Jugador                   | Inicio, explorar, actividad y perfil         | Reservar cancha, consultar sus reservas y unirse/salir de partidos                 |
| Capitán de partido        | Opciones del jugador + crear                 | Crear y gestionar únicamente sus partidos y participantes                          |
| Operador de complejo      | Opciones personales + gestión                | Consultar y operar reservas de organizaciones asignadas                            |
| Administrador/propietario | Opciones personales + gestión                | Administrar organización, miembros, sedes, canchas, disponibilidad y operación     |
| Organizador de torneo     | Opciones personales + organización de torneo | Gestionar solo campeonatos asignados, equipos, fixture y resultados según permisos |
| Soporte/moderación        | Consola restringida                          | Funciones explícitas, justificadas y auditadas; sin operación financiera rutinaria |
| Administrador global      | Consola de plataforma                        | Configuración excepcional bajo privilegio mínimo y auditoría reforzada             |

Un usuario puede tener más de una relación contextual. La navegación debe agrupar las capacidades elevadas en una entrada de gestión, evitando saturar la experiencia del jugador.

## Perfiles principales de experiencia

La interfaz se organizará alrededor de cuatro perfiles comprensibles para el público. Estos perfiles
no reemplazan los roles ni permisos técnicos anteriores: agrupan capacidades para presentar una
experiencia clara, mientras Spring Boot continúa autorizando permiso, tenant, recurso y estado.

| Perfil de experiencia       | Relación con el modelo de seguridad                                                    | Experiencia principal                                                                                              |
| --------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Usuario general             | identidad autenticada con relación `PLAYER` cuando participa                           | explorar, reservar canchas, inscribirse o retirarse de partidos y consultar su actividad                           |
| Organizador                 | `CAPTAIN` sobre partidos propios y/o `TOURNAMENT_ORGANIZER` dentro del ámbito asignado | crear y administrar partidos; organizar campeonatos, equipos, fixture y resultados según permisos                  |
| Dueño de cancha             | `ORG_OWNER`; puede delegar en `ORG_ADMIN`, `VENUE_MANAGER` o `RECEPTIONIST`            | administrar sus complejos, canchas, disponibilidad, precios, reservas y operación del negocio                      |
| Administrador de plataforma | `PLATFORM_ADMIN` global                                                                | configuración excepcional, supervisión y auditoría reforzada; no sustituye la operación cotidiana de los complejos |

Una misma persona puede acumular perfiles contextuales. Por ejemplo, el dueño de un complejo puede
reservar como jugador, pero la navegación separará `Inicio/Explorar/Actividad` de `Gestión` para no
mezclar tareas. Ningún perfil visual concede privilegios por sí mismo ni evita la validación del
backend.

### Solicitudes de perfil implementadas

Desde el perfil autenticado, una persona puede solicitar organizar partidos abiertos
(`MATCH_ORGANIZER`) o representar a un dueño de cancha (`VENUE_OWNER`). El backend conserva la
solicitud con estado `PENDING`, `APPROVED`, `REJECTED` o `REVOKED`, además del motivo y las fechas
de revisión. La interfaz no concede permisos: la aprobación administrativa y la membresía
contextual continúan siendo requisitos separados.

Estas solicitudes no activan cobros ni licencias. Los planes comerciales quedan pendientes de una
decisión aprobada sobre modelo, vigencia, proveedor, cancelación e impuestos.

La revisión administrativa está disponible en `/api/v1/platform/capability-requests` y requiere la
authority `ROLE_PLATFORM_ADMIN`, derivada exclusivamente de `realm_access.roles` del token emitido
por Keycloak. Aprobar o rechazar una solicitud genera un evento de auditoría; la aprobación no
crea por sí sola una membresía de organización.

## Reglas contextuales obligatorias

- tenant del usuario coincide con tenant del recurso;
- capitán coincide con `match.captain_user_id`;
- delegado pertenece al equipo y torneo;
- reserva pertenece a una sede autorizada;
- operación es válida para el estado actual;
- permisos financieros pueden requerir doble aprobación futura;
- recursos públicos exponen solo campos permitidos.

## Pruebas mínimas por permiso

Para cada operación crítica:

1. usuario sin autenticar recibe 401;
2. autenticado sin permiso recibe 403;
3. rol correcto en otra organización recibe 403;
4. permiso correcto y organización correcta funciona;
5. recurso inexistente no filtra información sensible;
6. acción permitida queda auditada cuando corresponda.
