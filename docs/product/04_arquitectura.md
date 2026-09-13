# 4. Arquitectura de solución

## Enfoque recomendado

Arquitectura de **monolito modular** para el MVP. Permite desarrollar y operar con menor complejidad que microservicios, manteniendo límites claros para separar componentes en el futuro.

## Vista de contexto

```text
Jugador / Capitán ─┐
Complejo deportivo ├── Web móvil / PWA ── API del producto ── PostgreSQL
Organizador ───────┤                         │
Operador ──────────┘                         ├── Proveedor de autenticación/OTP
                                            ├── WhatsApp / correo
                                            ├── Pasarela o conciliación de pagos
                                            └── Almacenamiento de archivos
```

## Componentes

| Componente | Responsabilidad |
|---|---|
| Web/PWA | experiencia de jugadores, capitanes, complejos y organizadores |
| API | reglas de negocio, autorización y contratos externos |
| Identidad y acceso | OTP, sesiones, roles y recuperación |
| Partidos | creación, cupos, participantes, espera y asistencia |
| Reservas | disponibilidad, bloqueo, precio, adelantos y cancelaciones |
| Complejos | sedes, espacios, horarios, políticas y administradores |
| Torneos | equipos, plantillas, fixture, resultados y tabla |
| Pagos | órdenes, estado, conciliación, devoluciones y referencias |
| Notificaciones | plantillas, eventos, reintentos y preferencias |
| Moderación | reportes, bloqueos e incidencias |
| Analítica | eventos y métricas del producto |
| Administración | configuración, soporte y auditoría |

## Stack tecnológico recomendado

### Backend

- Java 21 LTS o versión LTS vigente al iniciar el desarrollo;
- Spring Boot;
- Spring Security como Resource Server OAuth 2.0/OIDC;
- Spring Data JPA/Hibernate;
- PostgreSQL;
- Flyway para migraciones;
- Bean Validation;
- Testcontainers para integración;
- OpenAPI para contrato de API;
- Redis únicamente cuando existan necesidades concretas de caché, rate limiting o trabajos distribuidos;
- almacenamiento compatible con S3 para archivos.

El backend Spring Boot es la autoridad de todas las reglas de negocio y autorización. El frontend nunca decide por sí solo si una operación está permitida.

### Frontend

Se recomienda **Next.js con React y TypeScript**, usando App Router y una experiencia web móvil/PWA.

Razones:

- ecosistema maduro y amplia disponibilidad de componentes;
- renderizado de páginas públicas para partidos, torneos y complejos;
- buena experiencia móvil sin construir primero aplicaciones nativas;
- tipado compartible a partir del contrato OpenAPI;
- soporte para un Backend for Frontend ligero cuando se necesiten cookies seguras o adaptación de sesión.

El backend de Next.js no reemplazará a Spring Boot. Su uso será de presentación o BFF; las reglas y datos sensibles permanecen en Java.

### Identidad y acceso

Se recomienda **Keycloak como proveedor OIDC** y **Spring Security para validar tokens y autorizar operaciones**.

Responsabilidades:

- Keycloak: login, credenciales, OTP/MFA, recuperación, sesiones, emisión y rotación de tokens, federación futura;
- Spring Security: validación de firma, emisor, audiencia, expiración y autorización de endpoints/métodos;
- PostgreSQL del producto: perfiles, membresías, roles contextuales, permisos y reglas multicomplejo.

No utilizar el adaptador antiguo de Keycloak para Spring. La integración debe emplear los estándares OAuth 2.0/OIDC de Spring Security Resource Server.

### Infraestructura

- contenedores Docker;
- ambientes local, test, staging y producción;
- PostgreSQL administrado;
- Keycloak administrado por el equipo o proveedor compatible con OIDC;
- proxy/gateway con TLS, límites y cabeceras de seguridad;
- logs centralizados, métricas, errores y trazas;
- CI/CD con pruebas, análisis de dependencias y despliegue automatizado.

## Multi-tenancy

El producto será multicomplejo. Cada registro operacional sensible llevará `organization_id` o `complex_id` según corresponda.

Controles obligatorios:

- filtrado de tenant en repositorios/servicios;
- verificación de pertenencia en backend;
- pruebas automáticas de aislamiento;
- administrador global separado del administrador del complejo;
- ninguna autorización depende únicamente de ocultar botones en frontend.

## Modelo de autorización

Se aplicará un modelo híbrido:

- **RBAC:** roles reutilizables;
- **permisos:** acciones atómicas;
- **ABAC contextual:** tenant, propiedad del recurso, estado y relación con el evento.

Ejemplo:

```text
Rol: COMPLEX_ADMIN
Permisos: venue:read, venue:update, reservation:read, reservation:manage
Contexto: solo cuando membership.organization_id == reservation.organization_id
```

Los roles globales serán mínimos. Los roles de organización se resolverán en la base del producto porque una misma persona puede ser jugador, capitán y administrador de un complejo diferente.

### Entidades de autorización

- `users`: referencia al `sub` emitido por el proveedor de identidad;
- `organizations`: tenant comercial;
- `memberships`: usuario + organización + estado;
- `roles`: conjuntos reutilizables;
- `permissions`: acciones atómicas;
- `membership_roles`: roles dentro de una organización;
- `role_permissions`: permisos concedidos por rol.

El token prueba identidad. La base de datos confirma el acceso contextual y vigente.

## Ambientes

- `local`: desarrollo individual;
- `test`: pruebas automáticas;
- `staging`: validación previa con datos ficticios;
- `production`: usuarios reales.

No copiar datos personales de producción hacia desarrollo.

## Decisiones arquitectónicas iniciales

- API versionada desde `/api/v1`.
- identificadores UUID.
- fechas almacenadas en UTC y mostradas en America/Lima.
- dinero almacenado en unidades enteras mínimas, nunca flotantes.
- eventos de dominio para notificaciones y analítica.
- idempotencia en pagos, reservas y callbacks.
- migraciones versionadas de base de datos.
- frontend y backend en repositorios separados o monorepo con despliegues independientes;
- autorización protegida en capa HTTP y capa de servicio mediante Spring Security;
- tokens de acceso cortos y sesiones/refresh gestionados por el proveedor de identidad;
- no almacenar permisos completos y de larga duración únicamente en el JWT.

## Evolución futura

Separar servicios solo cuando existan motivos medibles: carga, equipos independientes, disponibilidad distinta o aislamiento de riesgo. Los primeros candidatos serían notificaciones, pagos y analítica.
