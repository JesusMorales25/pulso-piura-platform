# Pulso Piura

Plataforma web mobile-first para organizar partidos, completar jugadores y conectar la demanda deportiva con complejos de Piura.

## Estado

La beta local incluye identidad con Google federado, perfiles, permisos de plataforma y por
organización, sedes, canchas, disponibilidad, reservas concurrentes, pagos simulados, partidos
abiertos, comercios aliados y pases QR de llegada. Los cobros reales siguen deshabilitados hasta
integrar un proveedor autorizado.

## Arquitectura

- `frontend/`: Next.js, React y TypeScript.

## Datos locales de demostración

Con los servicios iniciados, carga un escenario idempotente para pruebas:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\seed-demo-data.ps1
```

El escenario contiene una organización, dos sedes publicadas, tres espacios deportivos,
disponibilidad semanal y usuarios `PLAYER`, `OWNER`, `ADMIN`, `OPERATOR` y
`PLATFORM_ADMIN`. Todos usan `TEST_USER_PASSWORD` de `.env`; los correos pueden
personalizarse con las variables `DEMO_*_EMAIL` documentadas en `.env.example`.

- `backend/`: Java 21, Spring Boot, Spring Security y Flyway.
- `infra/keycloak/`: realm local OIDC; preparado para federación con Google.
- `docs/product/`: documentación funcional y técnica aprobada.
- `docs/adr/`: decisiones arquitectónicas.
- `docs/IDENTITY_LOCAL_SETUP.md`: activación local de Keycloak y Google.

## Inicio local

La separación exacta entre el entorno local y Oracle/Coolify está documentada en
[`docs/CONFIGURACIONES_LOCAL_Y_PRODUCCION.md`](docs/CONFIGURACIONES_LOCAL_Y_PRODUCCION.md).

1. Instalar e iniciar Docker Desktop.
2. Revisar el archivo local `.env` — está ignorado por Git.
3. Ejecutar `powershell -ExecutionPolicy Bypass -File scripts/start-local.ps1`.
4. Para detener todo, ejecutar `powershell -ExecutionPolicy Bypass -File scripts/stop-local.ps1`.

Para trabajar desde terminales separadas de VS Code:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/run-infrastructure.ps1
powershell -ExecutionPolicy Bypass -File scripts/run-backend.ps1
powershell -ExecutionPolicy Bypass -File scripts/run-frontend.ps1
```

El backend debe iniciarse mediante `run-backend.ps1` mientras se resuelve la incidencia local de
classpath largo en `testCompile`; las pruebas continúan ejecutándose por separado.

Después de reiniciar el backend y aplicar migraciones, validar la Iteración 3 con:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/validate-iteration-3.ps1
```

Para validar el contrato público y las protecciones básicas de reservas de la Iteración 4:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/validate-iteration-4.ps1
powershell -ExecutionPolicy Bypass -File scripts/validate-reservation-concurrency.ps1
```

URLs locales: web `http://localhost:3000`, API `http://localhost:8080`, Keycloak `http://localhost:8180`.

El script crea o actualiza el usuario de prueba definido por `TEST_USER_EMAIL` y `TEST_USER_PASSWORD` sin versionar su contraseña.

## Límites actuales

- Google Login requiere credenciales propias configuradas en Keycloak; no se almacenan secretos en Git.
- La beta de identidad usa Authorization Code + PKCE y conserva el estado OIDC en `sessionStorage`; la evolución prevista es evaluar un BFF antes de manejar pagos reales.
- Yape y Plin se integrarán mediante un proveedor autorizado y una interfaz desacoplada; no se aceptarán capturas como confirmación automática.
- El backend es un monolito modular. No se crearán microservicios sin evidencia operativa.

## Preparación de producción

La topología y el procedimiento para Oracle Cloud Free Tier están en
[`docs/PRODUCCION_ORACLE_FREE_TIER.md`](docs/PRODUCCION_ORACLE_FREE_TIER.md). No publiques el
entorno local ni reutilices sus contraseñas o secretos.

El resultado de la revisión OWASP y sus límites están en
[`docs/REVISION_SEGURIDAD_OWASP_2026-09-12.md`](docs/REVISION_SEGURIDAD_OWASP_2026-09-12.md).

La publicación simplificada en una VM de Oracle administrada con Coolify está en
[`deploy/coolify/README.md`](deploy/coolify/README.md).

La demostración temporal con frontend en Vercel, Auth0 y API/PostgreSQL en
Render está documentada en
[`deploy/render-vercel/README.md`](deploy/render-vercel/README.md).
