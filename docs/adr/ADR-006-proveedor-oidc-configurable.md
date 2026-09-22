# ADR-006: Proveedor OIDC configurable

**Estado:** aceptado · **Fecha:** 2026-09-21

## Contexto

Keycloak conserva valor para un despliegue controlado, pero supera la memoria
disponible en el servicio gratuito utilizado para la demostración. Implementar
contraseñas dentro del producto trasladaría riesgos y operación de identidad al
equipo de Pulso Piura.

## Decisión

La autenticación se delega a un proveedor OIDC elegido por ambiente. Auth0 será
el proveedor administrado de la demostración y Keycloak continuará como opción
local y de producción autogestionada. Next.js usa Authorization Code con PKCE y
Spring Boot funciona como Resource Server para un único emisor confiable por
despliegue.

La selección se realiza con `AUTH_PROVIDER`/`NEXT_PUBLIC_AUTH_PROVIDER`, el
emisor, cliente y audiencia. Los roles globales pueden proceder de una claim
configurable; los permisos por organización, capacidades y reglas sobre recursos
continúan en PostgreSQL y Spring.

Para la demostración, Auth0 habilita la conexión de base de datos con registro e
inicio por correo y contraseña, además de Google como conexión social. Ambos
flujos terminan en tokens OIDC emitidos por Auth0. Keycloak se conserva como
opción configurable, pero no se ejecuta ni consume recursos en Render.

El rol `PLATFORM_ADMIN` también puede derivarse de `PLATFORM_ADMIN_EMAIL`, pero
solo para un token válido del emisor configurado cuyo correo esté verificado.
Este mecanismo permite preparar la cuenta inicial sin guardar contraseñas en el
repositorio.

## Consecuencias

- Cambiar entre Auth0, Keycloak u otro proveedor OIDC no modifica los módulos de
  reservas, canchas, partidos o pagos.
- Nunca se aceptan directamente tokens de Google.
- Cada ambiente confía en un solo emisor y una audiencia exacta.
- Las cuentas privilegiadas requieren MFA en el proveedor.
- Cambiar de emisor no vincula automáticamente identidades existentes por correo;
  una migración o vinculación explícita debe conservar el usuario interno.
- La autenticación local con contraseñas permanece fuera del alcance.
