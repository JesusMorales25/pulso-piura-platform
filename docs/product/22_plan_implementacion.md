# 22. Plan de implementación

## Condición de inicio

No comenzar funcionalidades hasta aprobar:

- alcance P0/P1;
- modelo físico inicial;
- operación de Keycloak por ambiente;
- política de cuentas y Google;
- diseño visual mínimo;
- criterios de validación del piloto.

## Iteración 0 — Fundaciones

Entregables:

- repositorio y `AGENTS.md`;
- backend Spring Boot modular;
- frontend Next.js/TypeScript;
- Docker Compose local;
- PostgreSQL y Flyway;
- Keycloak local con realm versionado;
- CI con compilación, pruebas, lint y análisis de secretos;
- OpenAPI inicial;
- logging y correlation ID;
- ADR-001 a ADR-005.

Criterio: cualquier desarrollador puede levantar el entorno desde instrucciones limpias.

## Iteración 1 — Identidad y perfiles

- Google federado en Keycloak;
- Resource Server;
- `/me`;
- provisión de usuario al primer acceso;
- onboarding de perfil;
- pruebas de token y cuenta suspendida;
- auditoría de primer acceso.

Criterio: registro/login funciona sin conceder permisos indebidos.

## Iteración 2 — Organizaciones y RBAC

- organizaciones;
- memberships;
- roles y permisos;
- invitación/revocación;
- autorización contextual;
- pruebas otro-tenant.
- navegación frontend derivada de capacidades y membresías vigentes;
- acceso directo a pantallas restringidas con estado seguro y sin exponer opciones ajenas al rol.

Criterio: un administrador nunca opera otra organización.

## Iteración 3 — Sedes y disponibilidad

- venues y sport spaces;
- reglas/excepciones;
- búsqueda pública;
- administración autorizada;
- manejo de zona horaria.

## Iteración 4 — Reservas

- cálculo de slots;
- hold con expiración;
- constraint anti-solapamiento;
- idempotencia;
- confirmar/cancelar;
- pruebas concurrentes.

## Iteración 4B — Reservas avanzadas

- series recurrentes y ocurrencias;
- conflictos parciales explícitos;
- historial para jugador y organización;
- pase QR opaco y check-in auditado.

Condicionada a que la reserva simple y la prevención de solapamiento estén verificadas.

## Iteración 5 — Partidos

- crear/editar/publicar;
- enlace compartible;
- unirse;
- cupos;
- lista de espera;
- reemplazo;
- asistencia.

Criterio: se puede ejecutar el primer piloto funcional de partido.

## Iteración 5B — Quórum automatizado

- plazo de confirmación configurable dentro de límites;
- confirmación o cancelación idempotente;
- integración con devolución, crédito o reprogramación según el estado real del pago;
- notificación y auditoría.

## Iteración 6 — Pagos operativos y notificaciones

- PaymentOrder;
- estado manual verificable;
- recordatorios;
- reintentos;
- plantillas;
- auditoría.

No integrar una pasarela hasta decidir proveedor y cumplimiento.

## Iteración 7 — Mini campeonatos

Condicionada por encuesta/piloto:

- torneos;
- equipos y plantillas;
- fixture básico;
- resultados y tabla;
- roles de organizador/delegado.

## Iteración 7B — Estadísticas de torneo

- goleadores;
- tarjetas e incidencias;
- correcciones aprobadas y auditadas;
- vistas públicas sin información sensible.

## Iteración 8 — Beta cerrada

- hardening ASVS;
- rendimiento;
- backups/restauración;
- soporte/moderación;
- métricas de producto;
- términos y privacidad;
- pruebas con complejos seleccionados.

Después del núcleo de beta se evaluarán:

- directorio de clientes derivado por organización;
- segmentación transparente y consentimiento de marketing;
- promociones y cartelera de eventos;
- exportación ICS y conexión opcional con Google Calendar.

## Iteración 9 — Comercios aliados condicionada

- campañas, vigencia, ubicaciones y beneficios;
- enlaces externos seguros;
- métricas agregadas de clics y controles antiabuso;
- planes y cobros publicitarios separados de reservas;
- política de categorías, menores y revisión de contenido.

No comienza sin evidencia de demanda, responsable comercial, política de contenido y decisión de
modelo de cobro. Las tarifas del documento de origen no se codifican.

## Backlog técnico transversal

- outbox para eventos críticos;
- cache solo con medición;
- rate limiting distribuido cuando sea necesario;
- escaneo de archivos;
- observabilidad avanzada;
- exportación y eliminación de datos;
- integración de pago;
- aplicación móvil nativa, solo después de validar recurrencia.

## Estrategia de entregas

Cada iteración debe producir una parte desplegable y demostrable. No se crean simultáneamente todos los módulos ni se esperan meses para integrar seguridad.

Al cierre de cada iteración:

1. demostración;
2. pruebas automatizadas;
3. revisión de amenazas;
4. actualización de OpenAPI y documentación;
5. decisión de continuar/ajustar;
6. registro de deuda explícita.
