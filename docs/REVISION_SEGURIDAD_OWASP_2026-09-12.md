# Revisión de seguridad OWASP — 12 de septiembre de 2026

## Alcance

Se revisaron el backend Spring Boot, frontend Next.js, migraciones Flyway, Keycloak, Docker Compose, scripts y documentación. Se excluyeron dependencias instaladas y salidas generadas (`node_modules`, `.next`, `target` y `.local`). La referencia usada fue OWASP Top 10 2025.

## Resultado de la instantánea previa a las correcciones

| Severidad | Hallazgo | Estado en esta preparación |
|---|---|---|
| Alta | Secreto Google OAuth activo dentro del `.env` local | Requiere revocación y rotación manual antes de publicar |
| Alta | Una cuenta podía crear una cantidad ilimitada de HOLD en franjas distintas | Corregido con cuota transaccional por usuario |
| Media | PostgreSQL y Keycloak locales escuchaban en todas las interfaces | Corregido: puertos vinculados a `127.0.0.1` |
| Baja | Dos retiros simultáneos de OWNER podían dejar una organización sin propietario | Corregido con bloqueo de la organización antes de contar y actualizar |

El informe sellado de la instantánea se generó con Codex Security bajo el identificador `50bd5447-be74-466f-9506-fe8e7f14fd4a`.

## Dependencias revisadas

- Frontend: Next.js `16.3.3`, React `19.2.0` y `oidc-client-ts` `3.5.0`. La versión de Next.js incluye las correcciones publicadas para los avisos críticos recientes de procesamiento AVIF y ejecución en Windows.
- Identidad: Keycloak `26.7.3`, versión que incorpora las correcciones de seguridad publicadas por el proyecto en agosto de 2026.
- Backend: Spring Boot `3.5.16`, Spring Security `6.5.11`, Spring Data JPA `3.5.13` y Spring Framework `6.2.19`. Se revisaron las precondiciones de los avisos vigentes de WebAuthn/DPoP/AES, `Sort` no confiable en consultas nativas y evaluación de SpEL; no se encontró en el proyecto una ruta que cumpla esas precondiciones.

Spring Boot `3.5.16` fue la última entrega con soporte abierto de la rama 3.5. Debe planificarse y probarse la migración a una rama 4.x soportada antes de mantener el servicio público a largo plazo; no se hizo un cambio mayor automático porque requiere pruebas de compatibilidad de Spring Security, JPA, Flyway y Testcontainers.

Fuentes primarias:

- [Avisos oficiales de Next.js](https://github.com/vercel/next.js/security/advisories)
- [Keycloak 26.7.3](https://www.keycloak.org/2026/08/keycloak-2673-released)
- [Spring Boot 3.5.16](https://spring.io/blog/2026/06/25/spring-boot-3-5-16-available-now/)
- [Avisos de seguridad de Spring](https://spring.io/security/)

## Cobertura OWASP Top 10 2025

- A01 Broken Access Control: autorización global, capacidades, propiedad y aislamiento por organización revisados. No se confirmó cruce de tenant. Se corrigió la carrera administrativa de OWNER.
- A02 Security Misconfiguration: se detectaron el secreto operativo local y los listeners locales. Se añadieron separación de producción, TLS, cabeceras y secretos externos.
- A03 Software Supply Chain Failures: se verifican manifests y builds; falta incorporar escaneo automático de dependencias y secretos en CI.
- A04 Cryptographic Failures: JWT, PKCE y QR opaco usan controles adecuados. TLS queda terminado por Caddy en producción.
- A05 Injection: las consultas variables revisadas usan parámetros/ORM. No se confirmó una ruta de inyección.
- A06 Insecure Design: concurrencia de reservas/pagos está protegida por transacciones y constraints. Se añadió cuota contra agotamiento de inventario.
- A07 Authentication Failures: Keycloak aplica PKCE, sesiones, brute force y emisor/audiencia. Producción requiere MFA administrativo y rotación del secreto Google.
- A08 Software or Data Integrity Failures: Flyway valida el esquema e idempotencia protege operaciones críticas. Las imágenes aún deben fijarse por digest dentro del proceso de actualización.
- A09 Security Logging and Alerting Failures: existe auditoría de operaciones sensibles; falta centralizar alertas y retención en el entorno público.
- A10 Mishandling Exceptional Conditions: los errores API usan Problem Details y no exponen stack traces. Deben probarse fallos de disco, backup, restauración y caída de dependencias en la VM final.

## Límites

La revisión no sustituye un pentest, una evaluación ASVS ni una prueba de carga en la VM definitiva. No se validó dinero real porque la plataforma solo implementa `disabled` y `simulation`. El registro público de npm no fue accesible desde este entorno, por lo que `npm audit` debe ejecutarse otra vez en CI o en la VM antes del despliegue; el build, lint y chequeo de tipos sí fueron satisfactorios.
