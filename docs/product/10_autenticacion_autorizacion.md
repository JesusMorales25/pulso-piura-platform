# 10. Autenticación y autorización

## Decisión de diseño

La identidad se delegará a un proveedor OIDC compatible. Auth0 se usa en la demostración y Keycloak permanece disponible para entornos autogestionados. Spring Boot funcionará como OAuth 2.0 Resource Server y será la autoridad de autorización del producto.

Google será una conexión social del proveedor OIDC. El backend confiará en un solo emisor por ambiente.

```text
Next.js ── Authorization Code + PKCE ── Keycloak
   │                                      │
   └──────── token/sesión ────────────────┘
   │
   └──────── Bearer/BFF ───────────────► Spring Boot
                                          │
                               JWT + permisos + contexto
```

## Responsabilidades

| Responsabilidad | Componente |
|---|---|
| Credenciales, MFA y recuperación | Keycloak/OIDC |
| Emisión, expiración y revocación de sesión | Keycloak/OIDC |
| Validación de JWT | Spring Security |
| Perfil deportivo | Base del producto |
| Membresía en organizaciones | Base del producto |
| Roles contextuales | Base del producto |
| Autorización sobre recursos | Spring Boot |
| Presentación/ocultamiento visual | Next.js, nunca como único control |

## Flujo de acceso

1. El usuario solicita iniciar sesión o selecciona “Continuar con Google”.
2. Next.js inicia Authorization Code Flow con PKCE.
3. Keycloak autentica directamente o delega en Google y aplica MFA cuando corresponda.
4. Se entrega una sesión segura y un access token de corta duración.
5. Spring Boot valida firma, algoritmo, `iss`, `aud`, `exp` y `nbf`.
6. El backend relaciona `sub` con `users.identity_subject`.
7. Para cada operación se verifican permiso, organización, recurso y estado.
8. Las decisiones sensibles generan auditoría.

## Estrategia de sesión del frontend

Preferencia: patrón BFF ligero en Next.js para que access y refresh tokens no estén disponibles a JavaScript del navegador.

- cookies `HttpOnly`, `Secure` y `SameSite`;
- protección CSRF en operaciones con cookies;
- no guardar refresh tokens en `localStorage`;
- access tokens cortos;
- rotación y revocación de sesión;
- Content Security Policy estricta.

Alternativa para una primera beta: SPA con Authorization Code + PKCE y access token solo en memoria. No persistirlo en almacenamiento local.

## Alta y vinculación de usuario

1. Keycloak crea la identidad.
2. El primer acceso genera `users` usando el `sub` como referencia externa.
3. Se crea `player_profile` mínimo.
4. Se registran versión de términos, privacidad y consentimientos.
5. La membresía en un complejo requiere invitación o aprobación.

No duplicar contraseñas, OTP o secretos de identidad en la base del producto.

## Validación JWT

Configuración obligatoria:

- `issuer-uri` exacto;
- audiencia propia de la API;
- algoritmos asimétricos permitidos;
- JWKS con rotación;
- tolerancia de reloj limitada;
- rechazo de tokens sin `sub`;
- rechazo de tokens destinados a otro cliente/API.

Ejemplo conceptual:

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://identity.example.com/realms/sports
          audiences: sports-api
```

## Capas de autorización

### Capa HTTP

- rutas públicas explícitas;
- resto autenticado por defecto;
- endpoints administrativos protegidos;
- CORS con orígenes permitidos exactos;
- límites para login, búsqueda, reserva y publicación.

### Capa de servicio

- `@EnableMethodSecurity`;
- anotaciones simples para permisos estables;
- servicio Java `AuthorizationService` para reglas contextuales;
- comprobación antes de escrituras;
- consultas filtradas por organización.

Ejemplo:

```java
@PreAuthorize("hasAuthority('reservation:manage') && " +
              "@authz.canManageReservation(authentication, #reservationId)")
public void cancel(UUID reservationId) { ... }
```

## Cambios de permisos

- revocar una membresía invalida acceso contextual inmediatamente;
- no depender exclusivamente de roles dentro de JWT de larga duración;
- cambios globales críticos pueden requerir cierre de sesiones;
- toda asignación/revocación registra actor, motivo y fecha;
- el usuario no puede elevar sus propios privilegios.

## Cuentas privilegiadas

- MFA obligatorio;
- sin cuentas compartidas;
- privilegio mínimo;
- administración global separada de la operación diaria;
- sesiones más cortas;
- alertas por acciones de alto riesgo;
- acceso de soporte temporal, justificado y auditado.
