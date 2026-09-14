# Configuraciones local y de producción

Los dos entornos son independientes. No copies las URLs ni los secretos de uno al otro.

## Desarrollo local

El entorno local usa estos archivos:

- `.env`, creado a partir de `.env.example` y excluido de Git.
- `compose.yaml`, que inicia únicamente PostgreSQL y Keycloak en Docker.
- `scripts/start-local.ps1`, que configura Keycloak mediante su API administrativa y ejecuta Spring Boot y Next.js directamente en Windows.

Inicio:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\start-local.ps1
```

Las URLs locales son `http://localhost:3000`, `http://localhost:8080` y `http://localhost:8180`. Los scripts verifican esos hosts antes de arrancar para detectar una mezcla accidental con producción.

El bootstrap local está en `scripts/bootstrap-keycloak-local.ps1`. No depende de `kcadm.sh`: Keycloak 26.7.3 devolvía `Cannot parse the JSON [unknown_error]` desde el contenedor auxiliar aunque el endpoint OIDC ya respondía correctamente desde Windows.

## Oracle con Coolify

La publicación prevista usa:

- `deploy/coolify/compose.coolify.yaml` como Docker Compose Location en Coolify.
- Variables secretas configuradas en el panel de Coolify; no usa el `.env` local.
- Dominios HTTPS públicos para frontend, API e identidad.
- PostgreSQL separado para la aplicación y para Keycloak.
- `infra/keycloak/bootstrap.sh` dentro del contenedor Linux de producción.

El procedimiento completo está en `deploy/coolify/README.md`. Esta es la configuración recomendada para la primera publicación en Oracle.

## Oracle sin Coolify

`deploy/oracle/compose.production.yaml` y `deploy/oracle/.env.production.example` permiten migrar más adelante a Docker Compose directo con Caddy. Es una alternativa a Coolify y no debe ejecutarse junto con él sobre los mismos puertos.

## Regla práctica

| Entorno | Compose | Variables | Bootstrap de Keycloak |
|---|---|---|---|
| Local | `compose.yaml` | `.env` | `scripts/bootstrap-keycloak-local.ps1` |
| Oracle + Coolify | `deploy/coolify/compose.coolify.yaml` | panel de Coolify | `infra/keycloak/bootstrap.sh` |
| Oracle directo | `deploy/oracle/compose.production.yaml` | `.env.production` privado | `infra/keycloak/bootstrap.sh` |

Nunca subas `.env` ni `.env.production` a Git. Los archivos `*.example` contienen solamente la plantilla de variables.
