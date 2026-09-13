# 16. Inicio de sesión y registro con Google

## Decisión

Google se integrará como proveedor de identidad social en Keycloak. Next.js no validará directamente tokens de Google contra el dominio, y Spring Boot no recibirá tokens de Google.

```text
Usuario → Next.js → Keycloak → Google
                    │
              cuenta federada
                    │
              token de Keycloak
                    │
                    └────────► Spring Boot
```

Esto mantiene un único emisor confiable para la API y permite agregar otros métodos de acceso sin modificar cada módulo del backend.

## Experiencia de usuario

### Registro nuevo

1. El usuario selecciona “Continuar con Google”.
2. Keycloak redirige a Google.
3. Google autentica y devuelve la identidad a Keycloak.
4. Keycloak crea o vincula la identidad interna.
5. El primer acceso crea el usuario de producto usando el `sub` de Keycloak.
6. La aplicación solicita únicamente datos faltantes: zona, deportes, términos y privacidad.
7. La cuenta queda activa con permisos básicos.

### Usuario existente

1. Google autentica.
2. Keycloak identifica la cuenta vinculada.
3. El usuario regresa a la aplicación sin crear un perfil duplicado.

## Datos solicitados

Para autenticación inicial:

- `openid`;
- `email`;
- `profile`.

No solicitar acceso a Gmail, contactos, Drive, Calendar u otras APIs. Tener correo `@gmail.com` no autoriza leer el buzón.

## Identificador estable

- no usar el correo como clave primaria;
- Google identifica mediante su `sub` externo;
- Keycloak vincula esa identidad y emite su propio `sub`;
- la aplicación guarda únicamente el `sub` de Keycloak como referencia de autenticación;
- el correo es un atributo modificable y no una autorización.

## Vinculación y duplicados

Riesgo: una persona puede registrarse primero con contraseña/correo y luego con Google.

Política:

- no vincular automáticamente solo porque el texto del correo coincide, salvo que el flujo garantice verificación y cumpla la política aprobada;
- ofrecer “Cuentas conectadas” dentro de configuración;
- solicitar reautenticación antes de vincular o desvincular;
- impedir que el usuario elimine su último método de acceso sin configurar otro;
- auditar vinculaciones y desvinculaciones.

La configuración `Trust Email` de Keycloak se habilitará únicamente para Google y después de comprobar que el proveedor transmite `email_verified` correctamente.

## Configuración por ambiente

Crear proyectos/credenciales separados para:

- desarrollo;
- staging;
- producción.

Cada ambiente tendrá:

- client ID/secret independiente;
- redirect URI exacta;
- dominio autorizado;
- pantalla de consentimiento y marca correspondientes;
- secretos en gestor seguro.

Producción utilizará HTTPS. Localhost podrá usar la excepción permitida únicamente durante desarrollo.

## Configuración en Keycloak

1. Crear realm del producto.
2. Agregar Identity Provider `Google`.
3. Copiar la Redirect URI generada por Keycloak.
4. Registrar esa URI exactamente en Google Cloud.
5. Configurar client ID y secret mediante secretos del ambiente.
6. Definir mappers mínimos para nombre, correo y fotografía.
7. Configurar First Broker Login Flow.
8. Probar alta, retorno, vínculo, conflicto y cuenta deshabilitada.

No activar `Store Tokens` del proveedor Google porque el producto solo necesita autenticación. Si en el futuro se requiere una API de Google, se diseñará un consentimiento separado e incremental.

## Botón y marca

- usar “Continuar con Google” o texto permitido;
- utilizar botón oficial o respetar exactamente marca, colores, proporciones y logo;
- mostrarlo con prominencia comparable a otros métodos externos;
- no diseñar una “G” modificada;
- ofrecer términos y privacidad accesibles desde la pantalla.

## Seguridad

- Authorization Code + PKCE;
- `state` contra CSRF y `nonce` cuando corresponda;
- redirect URIs exactas;
- HTTPS en ambientes públicos;
- access token de Keycloak corto;
- sesión/tokens protegidos mediante BFF/cookies HttpOnly preferentemente;
- validación de `iss`, `aud`, firma y tiempo en Spring Boot;
- rate limiting en inicio y vinculación;
- MFA obligatorio para administradores aunque utilicen Google;
- cierre de sesiones al suspender una cuenta.

## Casos de prueba

- registro exitoso con Google;
- retorno de usuario existente;
- correo no entregado o no verificado;
- rechazo/cancelación en Google;
- state/nonce inválido;
- redirect URI incorrecta;
- intento de vinculación a una cuenta ya vinculada;
- desvinculación del último método;
- usuario de producto suspendido aunque Google autentique;
- rol de otra organización no concedido por iniciar con Google;
- cierre de sesión local y federada según política.

## Criterios de aceptación

- Spring Boot recibe únicamente tokens emitidos por Keycloak;
- el primer acceso crea un único usuario de producto;
- no se utiliza correo como identificador principal;
- iniciar con Google no concede roles adicionales;
- se solicitan solo scopes de identidad;
- los secretos no aparecen en repositorios ni frontend;
- los flujos de vinculación están protegidos y auditados;
- el botón cumple las directrices de Google.

