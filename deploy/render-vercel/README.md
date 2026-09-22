# Demostración con Auth0, Render y Vercel

Esta variante usa Auth0 como proveedor OIDC administrado con registro e inicio
por correo y contraseña o Google. Despliega únicamente la API y PostgreSQL en Render y
mantiene Next.js en Vercel. Keycloak continúa disponible en el repositorio para
desarrollo local y futuros despliegues propios, pero no se ejecuta en Render ni
consume memoria durante la demostración.

## 1. Crear el tenant y la API en Auth0

1. Crea un tenant de Auth0 para la demostración.
2. En **Applications > APIs**, crea `Pulso Piura API`.
3. Usa como **Identifier** `https://api.pulsopiura.app` y firma `RS256`.
4. En **Applications > Applications**, crea una aplicación de tipo
   **Single Page Application** llamada `Pulso Piura Web`.
5. Guarda el dominio del tenant y el Client ID. El frontend no utiliza Client
   Secret porque el flujo es público y usa Authorization Code con PKCE.

En la aplicación configura exactamente:

```text
Allowed Callback URLs:
https://pulso-piura-platform.vercel.app/auth/callback

Allowed Logout URLs:
https://pulso-piura-platform.vercel.app

Allowed Web Origins:
https://pulso-piura-platform.vercel.app
```

En **Authentication > Database > Username-Password-Authentication**, permite el
registro y habilita la conexión para `Pulso Piura Web`. En **Authentication >
Social > Google**, configura las credenciales OAuth y habilita también la conexión
para `Pulso Piura Web`. Auth0 procesa ambas formas de acceso fuera de la API de
Pulso Piura, por lo que habilitar Google no aumenta de forma relevante la memoria
utilizada por el backend.

## 2. Configurar Vercel

Selecciona `frontend` como **Root Directory** y agrega estas variables al ambiente
Production antes de desplegar:

```text
NEXT_PUBLIC_API_BASE_URL=https://pulso-piura-api-jesusmorales25.onrender.com/api/v1
NEXT_PUBLIC_AUTH_PROVIDER=auth0
NEXT_PUBLIC_OIDC_ISSUER=https://TU_DOMINIO_AUTH0/
NEXT_PUBLIC_OIDC_CLIENT_ID=TU_CLIENT_ID
NEXT_PUBLIC_OIDC_AUDIENCE=https://api.pulsopiura.app
NEXT_PUBLIC_OIDC_ROLES_CLAIM=https://pulsopiura.app/roles
NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED=true
```

El valor de `NEXT_PUBLIC_OIDC_ISSUER` debe coincidir exactamente con el `issuer`
publicado por Auth0, incluida la barra final cuando aparezca en su metadata.

## 3. Configurar Render

Conecta el repositorio como Blueprint y usa `render.yaml`. El Blueprint crea
solamente la API y PostgreSQL; ya no intenta ejecutar Keycloak. Completa:

| Variable | Valor |
| --- | --- |
| `OIDC_ISSUER_URI` | El mismo issuer de Auth0 usado en Vercel |
| `OIDC_JWK_SET_URI` | `https://TU_DOMINIO_AUTH0/.well-known/jwks.json` |
| `OIDC_AUDIENCE` | `https://api.pulsopiura.app` |
| `OIDC_CLAIMS_NAMESPACE` | `https://pulsopiura.app` |
| `PLATFORM_ADMIN_EMAIL` | Correo real y exclusivo del administrador |

`WEB_ALLOWED_ORIGIN` ya apunta a la URL principal de Vercel. Si cambia el dominio,
actualízalo en Render y en las tres URLs autorizadas de Auth0.

Crea o registra en Auth0 la cuenta indicada por `PLATFORM_ADMIN_EMAIL` y verifica
su correo. Esta es la única cuenta administrativa inicial; su contraseña vive
únicamente en Auth0. El backend la crea internamente durante su primer ingreso y
concede `PLATFORM_ADMIN` solo cuando la firma, issuer, audiencia y correo
verificado son válidos. No agregues una contraseña administrativa a Render.

## 4. Claims de usuario y roles globales

Los permisos habituales viven en la base de Pulso Piura. Crea una Action
**Post Login** para entregar a la API los atributos del perfil. La misma Action
puede publicar roles globales desde `app_metadata`:

```javascript
exports.onExecutePostLogin = async (event, api) => {
  const namespace = "https://pulsopiura.app";
  const configuredRoles = event.user.app_metadata?.roles;
  const roles = Array.isArray(configuredRoles) ? configuredRoles : [];
  const displayName =
    event.user.name ||
    event.user.nickname ||
    event.user.email?.split("@")[0] ||
    "Jugador";
  api.accessToken.setCustomClaim(`${namespace}/roles`, roles);
  api.accessToken.setCustomClaim(`${namespace}/email`, event.user.email || "");
  api.accessToken.setCustomClaim(
    `${namespace}/email_verified`,
    event.user.email_verified === true,
  );
  api.accessToken.setCustomClaim(`${namespace}/name`, displayName);
  api.accessToken.setCustomClaim(`${namespace}/picture`, event.user.picture || "");
  api.idToken.setCustomClaim(`${namespace}/roles`, roles);
  api.idToken.setCustomClaim(`${namespace}/name`, displayName);
  api.idToken.setCustomClaim(`${namespace}/picture`, event.user.picture || "");
};
```

Las cuentas creadas con correo y contraseña no incluyen una fotografía por defecto. En ese caso la
interfaz muestra la inicial del nombre; una foto real proviene de Google o de una imagen configurada
en el perfil. Después de modificar esta Action, ejecuta **Deploy** y vuelve a iniciar sesión para
recibir los nuevos claims.

Esta Action es obligatoria para que la API reciba correo, verificación, nombre y
foto en el access token de Auth0. Después de crearla, selecciona **Deploy** y
arrástrala al flujo **Login**.

No agregues privilegios basándote en parámetros enviados por el navegador. Los
roles deben administrarse en Auth0 o en la base del producto.

## 5. Verificación

Comprueba primero:

```text
https://TU_DOMINIO_AUTH0/.well-known/openid-configuration
https://pulso-piura-api-jesusmorales25.onrender.com/actuator/health
```

Después valida registro, verificación de correo, inicio con contraseña, cierre
de sesión, perfil, panel del administrador, creación de partido y reserva.

## Cuenta administrativa inicial

1. Define en Render `PLATFORM_ADMIN_EMAIL` con el correo administrativo real.
2. Registra ese mismo correo desde Universal Login o desde **User Management >
   Users** usando la conexión `Username-Password-Authentication`.
3. Verifica el correo antes del primer ingreso.
4. Cierra cualquier sesión anterior y vuelve a ingresar para recibir un token
   nuevo.

No se requiere asignar el rol manualmente en Auth0: la API reconoce el correo
configurado únicamente cuando el token es válido y el correo está verificado.

## Desactivar Google temporalmente

Deshabilita la conexión Google para `Pulso Piura Web` en Auth0 y cambia
`NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED=false` en Vercel. No se requiere modificar el
código ni desplegar Keycloak.

## Volver a Keycloak u otro OIDC

El código no cambia. En cada ambiente reemplaza proveedor, issuer, cliente y
audiencia:

```text
AUTH_PROVIDER=keycloak
OIDC_ISSUER_URI=https://identidad.example.com/realms/pulso-piura
OIDC_AUDIENCE=pulso-api
OIDC_CLAIMS_NAMESPACE=https://pulsopiura.app
OIDC_ROLES_CLAIM=https://pulsopiura.app/roles

NEXT_PUBLIC_AUTH_PROVIDER=keycloak
NEXT_PUBLIC_OIDC_ISSUER=https://identidad.example.com/realms/pulso-piura
NEXT_PUBLIC_OIDC_CLIENT_ID=pulso-web
NEXT_PUBLIC_OIDC_AUDIENCE=pulso-api
```

Cambiar el proveedor no vincula por correo automáticamente a usuarios ya
existentes. Antes de cambiar un ambiente con datos reales se debe ejecutar una
migración explícita de identidades para conservar el mismo usuario interno.

## Límites de la demostración

- Render puede suspender la API gratuita por inactividad; el primer acceso puede
  tardar mientras vuelve a iniciar.
- La base gratuita no debe considerarse una base de producción ni reemplaza las
  copias de seguridad.
- Auth0 Free no ofrece el mismo SLA ni todas las funciones de un plan de pago.
- El frontend continúa como SPA con tokens en memoria/sessionStorage. Antes de
  pagos reales se debe evaluar el BFF documentado en la arquitectura.
