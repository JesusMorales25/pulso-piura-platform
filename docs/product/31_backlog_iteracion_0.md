# 31. Backlog listo para Iteración 0

## Objetivo

Crear una fundación reproducible, segura y observable. No desarrollar todavía reservas, partidos ni torneos.

## I0-01 — Estructura del repositorio

Entregables:

- `AGENTS.md` en raíz;
- `docs/` con línea base aprobada;
- `backend/` y `frontend/`;
- README de arranque;
- convenciones de ramas/commits por decidir.

Aceptación: un clon limpio explica requisitos y comandos sin conocimiento tribal.

## I0-02 — Backend Spring Boot

- proyecto Java LTS/Spring Boot;
- paquetes de módulos vacíos controlados;
- configuración tipada;
- Actuator mínimo;
- Problem Details;
- correlation ID;
- perfiles local/test/staging/prod;
- pruebas de contexto.

## I0-03 — PostgreSQL y Flyway

- PostgreSQL local en Docker;
- conexión y pool;
- `ddl-auto=validate`;
- migración inicial de infraestructura/health si procede;
- Testcontainers;
- comandos de migración documentados.

No crear todavía todas las tablas del dominio si el modelo no ha sido aprobado formalmente.

## I0-04 — Keycloak local

- realm versionable/exportable;
- cliente web y API;
- roles globales mínimos;
- usuarios ficticios;
- redirect URIs locales restringidas;
- secretos fuera de Git;
- documentación para Google posterior.

## I0-05 — Spring Security

- Resource Server;
- issuer/audience;
- rutas públicas explícitas;
- denegar resto;
- Method Security;
- manejadores 401/403;
- pruebas JWT válido/inválido/expirado/audiencia.

## I0-06 — Frontend Next.js

- TypeScript estricto;
- App Router;
- estilos/tokens mínimos;
- layouts público/autenticado/admin;
- manejo uniforme de errores;
- configuración por ambiente;
- pruebas básicas y accesibilidad inicial.

No construir un diseño visual definitivo antes de seleccionar dirección visual.

## I0-07 — Contrato API

- OpenAPI base;
- `/api/v1/health` público limitado;
- `/api/v1/me` protegido inicialmente simulado o mínimo;
- generación/tipado del cliente frontend evaluado;
- validación de compatibilidad en CI.

## I0-08 — Docker Compose

Servicios locales:

- PostgreSQL;
- Keycloak;
- backend;
- frontend opcionalmente;
- almacenamiento simulado cuando sea necesario.

Health checks, volúmenes y variables documentadas.

## I0-09 — CI y seguridad

- build backend/frontend;
- pruebas;
- formatter/lint;
- detección de secretos;
- análisis de dependencias;
- artefactos sin credenciales;
- política de fallo para riesgo crítico.

## I0-10 — Observabilidad mínima

- logs JSON en ambientes compartidos;
- correlation ID;
- métricas HTTP/JVM;
- no registrar tokens;
- dashboard/alertas se diseñan después, pero nombres quedan estables.

## I0-11 — ADR iniciales

- ADR-001 monolito modular;
- ADR-002 Keycloak/OIDC;
- ADR-003 Next.js/BFF;
- ADR-004 PostgreSQL/Flyway;
- ADR-005 estrategia multitenant;
- ADR-006 contrato REST/OpenAPI.

## Orden sugerido

```text
I0-01 → I0-02/I0-06
I0-03 → I0-04 → I0-05
I0-07 integra backend/frontend
I0-08 consolida entorno
I0-09/I0-10/I0-11 cierran la iteración
```

## Definition of Done de Iteración 0

- entorno se levanta desde cero;
- no hay secretos versionados;
- frontend alcanza backend protegido;
- token válido funciona y tokens inválidos fallan;
- CI pasa;
- documentación coincide con comandos;
- dependencias y decisiones están registradas;
- no se implementaron funciones fuera de fundación.

