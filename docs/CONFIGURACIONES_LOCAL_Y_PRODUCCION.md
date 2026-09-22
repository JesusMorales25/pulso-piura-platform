# Configuraciones local y de producción

Los dos entornos son independientes. No copies las URLs ni los secretos de uno al otro.

## Desarrollo local

El entorno local usa estos archivos:

- `.env`, creado a partir de `.env.example` y excluido de Git.
- `compose.yaml`, que proporciona PostgreSQL y, cuando se elige, Keycloak.
- `scripts/start-local.ps1`, que ejecuta Spring Boot y Next.js y selecciona un único proveedor OIDC.

Inicio:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\start-local.ps1
```

El comando anterior usa el proveedor definido en `.env` y, si está vacío, selecciona Keycloak.
También se puede elegirlo explícitamente:

```powershell
# Keycloak local
powershell -ExecutionPolicy Bypass -File scripts\start-local.ps1 -AuthProvider keycloak

# Auth0 externo y solo PostgreSQL en Docker
powershell -ExecutionPolicy Bypass -File scripts\start-local.ps1 -AuthProvider auth0
```

Para Auth0, `.env` debe tener `AUTH0_OIDC_ISSUER_URI`, `AUTH0_OIDC_JWK_SET_URI`,
`AUTH0_OIDC_AUDIENCE` y `AUTH0_OIDC_CLIENT_ID` con los mismos valores públicos del ambiente
publicado. El script los aplica al frontend y backend sin reemplazar la configuración local de
Keycloak. En Auth0 agrega:

```text
Allowed Callback URLs: http://localhost:3000/auth/callback
Allowed Logout URLs: http://localhost:3000
Allowed Web Origins: http://localhost:3000
```

El modo Auth0 no inicia ni prepara Keycloak. La contraseña y el Client Secret continúan fuera del
frontend y del repositorio.

La web y la API locales usan `http://localhost:3000` y `http://localhost:8080`. Keycloak usa
`http://localhost:8180` únicamente en su modo. Los scripts permiten el issuer HTTPS externo solo
cuando el proveedor elegido es Auth0.

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
