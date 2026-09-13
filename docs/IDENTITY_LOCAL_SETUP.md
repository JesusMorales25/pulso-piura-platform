# Configuración local de identidad

## Keycloak

1. Copiar `.env.example` a `.env` y establecer contraseñas locales.
2. Ejecutar `powershell -ExecutionPolicy Bypass -File scripts/start-local.ps1`. El bootstrap configura el realm y conserva únicamente la cuenta definida por `DEMO_PLATFORM_ADMIN_EMAIL` como administrador global.
3. El realm `pulso-piura` se importa con cliente público `pulso-web`, PKCE S256, redirect URI exacta y audiencia `pulso-api`.
4. `LOCAL_REQUIRE_EMAIL_VERIFICATION=false` permite probar el registro local sin SMTP. El bootstrap desactiva `verifyEmail` y repara cuentas locales detenidas en `VERIFY_EMAIL`.
5. `LOCAL_DEMO_USERS_ENABLED=false` evita recrear las cuentas locales de jugador, organizador y organización al reiniciar. `scripts/seed-demo-data.ps1` las habilita temporalmente cuando se solicita reconstruir los datos de demostración.
6. Producción debe usar `LOCAL_REQUIRE_EMAIL_VERIFICATION=true` y una configuración SMTP válida antes de aceptar registros.
7. Tras el primer acceso, una cuenta con onboarding pendiente se dirige a `/perfil`; al completar el perfil conserva los recorridos normales.

## Google

La federación necesita credenciales propias de Google Cloud y no puede activarse con valores ficticios. El bootstrap configura Keycloak de forma idempotente cuando las credenciales están presentes:

1. En [Google Cloud Console](https://console.cloud.google.com/) crear o seleccionar un proyecto.
2. Configurar **Google Auth Platform → Branding/Audience** como aplicación externa. Mientras esté en pruebas, agregar las cuentas Gmail autorizadas como usuarios de prueba.
3. Crear un cliente OAuth 2.0 de tipo **Web application**.
4. Registrar exactamente esta URI de redirección para desarrollo local:

   ```text
   http://localhost:8180/realms/pulso-piura/broker/google/endpoint
   ```

5. Agregar las credenciales únicamente al `.env` local, que está excluido de Git:

   ```dotenv
   GOOGLE_LOGIN_ENABLED=true
   GOOGLE_CLIENT_ID=cliente-generado.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=secreto-generado
   NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED=true
   ```

6. Reiniciar el entorno con `scripts/stop-local.ps1` y `scripts/start-local.ps1`. El bootstrap crea o actualiza el proveedor `google`, confía únicamente en el correo verificado por Google, mantiene `Store Tokens` desactivado y solicita solo `openid email profile`.
7. Abrir `http://localhost:3000/perfil` y seleccionar **Continuar con Google**.

Para un ambiente público, crear otro cliente OAuth y reemplazar la URI por:

```text
https://auth.DOMINIO/realms/pulso-piura/broker/google/endpoint
```

También deben cambiarse el issuer OIDC, el origen web y las redirecciones del cliente `pulso-web` al dominio HTTPS del ambiente. Nunca reutilizar el secret local ni colocarlo en una variable `NEXT_PUBLIC_*`.

## Sesión web actual

La beta usa Authorization Code + PKCE. El token de acceso permanece en memoria y se pierde al recargar; `sessionStorage` conserva únicamente estado transitorio del redirect. No se usa `localStorage`. La evolución prevista es un BFF con cookie `HttpOnly` y almacenamiento de sesión servidor.
