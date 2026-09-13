# Revisión de arquitectura, seguridad y estrategia de entrega

**Proyecto:** Pulso Piura  
**Fecha:** 5 de septiembre de 2026  
**Alcance revisado:** frontend Next.js, backend Spring Boot, PostgreSQL/Flyway, Keycloak, Docker
Compose, CI y documentación de producto.  
**Tipo de revisión:** análisis estático y arquitectónico del estado actual; no certificación ni
prueba de penetración.

## 1. Decisión ejecutiva

La arquitectura base es adecuada para el producto y debe conservarse:

- aplicación web responsive mobile-first con Next.js y TypeScript;
- API y reglas de negocio en Java 21 con Spring Boot;
- monolito modular, no microservicios prematuros;
- PostgreSQL como fuente transaccional;
- Keycloak para identidad OIDC y Spring Security para autorización;
- roles de organización y propiedad del recurso resueltos en la base del producto;
- Flyway, Docker y contratos HTTP versionados.

No conviene desarrollar todo el frontend primero ni todo el backend primero. El método recomendado
es trabajar por **cortes verticales**: diseño del flujo, contrato, dominio/backend, integración web y
pruebas del mismo caso de uso antes de pasar al siguiente.

## 2. Evaluación de decisiones tecnológicas

| Decisión | Evaluación | Motivo |
|---|---|---|
| Spring Boot modular | mantener | encaja con el conocimiento del equipo, transacciones y reglas complejas |
| Next.js web | mantener | permite experiencia móvil, páginas públicas y evolución a BFF/PWA |
| PostgreSQL | mantener | constraints, transacciones y exclusión de rangos son ideales para reservas |
| Keycloak + Spring Security | mantener | separa credenciales de la autorización contextual del producto |
| Supabase Auth | no incorporar ahora | duplicaría identidad y operación sin resolver mejor el RBAC contextual |
| Microservicios | no usar ahora | aumentarían despliegues, fallos distribuidos y consistencia sin demanda medida |
| Redis | diferir | solo cuando métricas demuestren necesidad de rate limit distribuido, caché o jobs |
| BFF de Next.js | adoptar antes del piloto público | reduce exposición de tokens al JavaScript y permite cookies HttpOnly |

### Keycloak frente a Supabase

Keycloak continúa siendo la mejor opción para este proyecto porque la autorización real vive en
Spring Boot y PostgreSQL. Keycloak debe administrar login, Google, recuperación, MFA y sesiones;
Spring debe decidir si el usuario puede operar una organización, reserva o partido. Supabase sería
razonable si también se adoptara su plataforma gestionada como decisión estratégica, pero usar
ambos proveedores de identidad aumentaría complejidad, migraciones y puntos de fallo.

## 3. Estado arquitectónico real

### Fortalezas

1. Rutas privadas por defecto y catálogo público declarado explícitamente en `SecurityConfig`.
2. CORS restringido a un origen exacto y sin credenciales para el modo Bearer actual.
3. Tokens OIDC mantenidos en memoria; no hay access/refresh token en `localStorage`.
4. Authorization Code con PKCE S256 configurado en Keycloak.
5. Membresía activa y tenant comprobados en backend, no en botones del frontend.
6. Repositorios de sedes y canchas incluyen `organizationId` en las consultas sensibles.
7. Reservas calculan organización y precio en servidor.
8. Idempotencia por usuario, fingerprint y clave única.
9. Constraint GiST impide solapamientos incluso bajo concurrencia.
10. Fechas UTC, moneda en unidades mínimas y migraciones versionadas.
11. Estados de dominio, control optimista y auditoría básica ya existen.
12. CI compila backend y ejecuta typecheck, lint, formato y build del frontend.

### Desviaciones respecto a la arquitectura documentada

La separación por paquetes es clara, pero todavía no es un monolito modular verificable. Varias
clases de `application` importan repositorios y entidades desde `infrastructure.persistence`, sobre
todo en `identity`, `profiles`, `organizations` y `venues`. Esto invierte la dependencia prevista:
la aplicación conoce el adaptador en vez de depender de un puerto propio.

`reservations` ya muestra el patrón objetivo correcto con `ReservationStore`,
`ReservationHistoryStore` y adaptadores JPA. Ese patrón debe extenderse gradualmente a los módulos
existentes, sin una reescritura masiva.

`ProjectConventionsTest` solo comprueba una cadena fija de versión de API. No verifica dependencias
entre módulos, ausencia de infraestructura en dominio/aplicación ni aislamiento entre paquetes.

## 4. Hallazgos y riesgos priorizados

### P1 — Controles obligatorios antes de producción pública

#### S1. Sesión SPA todavía expuesta al contexto JavaScript

El access token se mantiene en memoria, que es mejor que persistirlo, pero cualquier XSS ejecutado
en la página podría usarlo. Antes del piloto público debe adoptarse BFF con cookies `HttpOnly`,
`Secure` y `SameSite`; al cambiar a cookies deberá habilitarse protección CSRF y validación de
origen. La implementación actual es aceptable solo para desarrollo y beta controlada.

#### S2. Falta protección de abuso y agotamiento de recursos

No existe rate limiting implementado. Búsquedas públicas, consulta de disponibilidad, creación de
organizaciones, invitaciones y reservas necesitan límites diferenciados. La búsqueda pública carga
todas las sedes publicadas y luego filtra en memoria; además puede consultar espacios por sede. Es
funcional para pocos complejos, pero no escalable y amplifica un posible DoS de lectura.

Acción: paginar y filtrar en SQL, eliminar N+1, medir consultas y aplicar límites en gateway/API.

#### S3. Producción de Keycloak aún no diseñada operacionalmente

Compose usa `start-dev`, importa un realm local y publica Keycloak directamente. No hay evidencia
implementada de TLS, proxy confiable, MFA administrativo, rotación/backup del realm, alta
disponibilidad ni actualización segura. Es correcto para local, pero no debe promoverse a staging o
producción.

#### S4. Recuperación, respaldo y observabilidad no implementados

La documentación menciona backup, restauración, alertas y logs centralizados, pero el repositorio no
incluye todavía infraestructura o pruebas que los garanticen. Un producto que maneje reservas y
pagos no está listo para producción sin RPO/RTO, restauración ensayada y alertas.

### P2 — Endurecimiento previo al piloto

#### S5. Cabeceras del frontend incompletas

Next.js desactiva `X-Powered-By`, pero no define CSP, `frame-ancestors`, Referrer-Policy,
Permissions-Policy ni HSTS en el borde. Una CSP estricta reduce especialmente el riesgo del modo SPA
actual. Debe diseñarse junto con Keycloak, imágenes y futuros proveedores de pago.

#### S6. Auditoría parcial

La auditoría actual registra varias operaciones exitosas, pero no muestra cobertura uniforme de
denegaciones, cambios de privilegio, correlación, origen seudonimizado, retención ni protección de
acceso. Los pagos, reservas, roles y soporte requieren eventos append-only y monitoreo de acciones
fallidas de alto riesgo.

#### S7. Límites modulares no comprobados automáticamente

La arquitectura depende de disciplina manual. Incorporar Spring Modulith o ArchUnit permitirá
fallar CI cuando un módulo acceda al repositorio interno de otro o cuando dominio/aplicación dependa
de infraestructura.

#### S8. Pipeline sin controles de cadena de suministro

CI no ejecuta SCA, secret scanning, SBOM, revisión de imágenes ni análisis estático de seguridad. Las
acciones de GitHub usan etiquetas mayores, no SHA inmutable. Deben añadirse Dependabot/Renovate,
CodeQL o equivalente, escaneo de secretos, Trivy/Grype y SBOM antes del piloto.

#### S9. Servicios locales publicados en todas las interfaces

Los puertos de PostgreSQL y Keycloak en Compose se enlazan por defecto a `0.0.0.0`. En redes no
confiables pueden quedar accesibles desde otros equipos. Para desarrollo deben vincularse a
`127.0.0.1` salvo necesidad explícita.

### P3 — Mejoras de diseño y mantenibilidad

1. mover permisos desde el mapa Java a un modelo persistente solo cuando los roles requieran
   configuración; mientras tanto el enum es más seguro y simple;
2. separar permisos funcionales de etiquetas de rol: `venue:manage`, `schedule:manage`,
   `reservation:read`, `reservation:operate`, `member:manage`;
3. añadir política explícita de transferencia de propiedad y garantía de al menos un propietario;
4. impedir rutas de retorno `//host` aunque hoy el `returnTo` solo se construya internamente;
5. definir límites de tamaño y retención antes de incorporar imágenes de complejos o comprobantes;
6. no guardar capturas de Yape/Plin como confirmación automática.

## 5. Aclaración sobre la revocación del propietario

La capa de servicio permite que un administrador solicite la revocación de cualquier `userId`, pero
`MembershipEntity.revoke` rechaza el rol `OWNER`; por tanto el propietario **no puede ser revocado**
en el estado actual. El control existe y falla de forma segura. Debe añadirse una prueba de servicio
y devolver un error de negocio más explícito; la interfaz no debe considerarse el control.

## 6. Modelo de autorización recomendado

Mantener un modelo híbrido:

```text
Identidad global (Keycloak sub)
        │
        ▼
Usuario local ── Perfil de jugador
        │
        ├── Membresía Organización A ── roles/permisos contextuales
        └── Membresía Organización B ── roles/permisos contextuales distintos

Decisión final = autenticación + permiso + tenant + propiedad + estado del recurso
```

Roles iniciales recomendados:

- `PLAYER`: condición base del usuario, no rol de organización;
- `OWNER`: propiedad, configuración y delegación del complejo;
- `ADMIN`: administración delegada, sin transferencia/revocación del propietario;
- `OPERATOR`: horarios, reservas, check-in y operación diaria;
- `PLATFORM_ADMIN`: soporte excepcional, separado, con MFA y auditoría reforzada.

No colocar todas las membresías y permisos duraderos en el JWT. El token prueba identidad y roles
globales mínimos; PostgreSQL confirma el permiso contextual vigente.

## 7. Forma recomendada de construir las funcionalidades de las referencias

### Método por corte vertical

Para cada función:

1. definir historia, estados visibles y regla de seguridad;
2. diseñar el flujo móvil y usar datos contractuales realistas;
3. fijar OpenAPI y errores;
4. implementar dominio, persistencia, autorización e idempotencia;
5. conectar el frontend sin lógica de negocio duplicada;
6. probar unidad, integración PostgreSQL, autorización negativa y E2E móvil;
7. actualizar documentación y demostrar el incremento.

### Orden recomendado

| Orden | Corte vertical | Resultado visible |
|---:|---|---|
| 1 | reservas 4C/4D | elegir slot, crear hold, confirmar/cancelar y ver Actividad |
| 2 | partidos abiertos | crear, publicar, compartir y ver detalle de partido |
| 3 | participantes/cupos | unirse, retirarse, lista de espera y ocupación real |
| 4 | pagos | orden verificable y confirmación mediante Yape/Plin/proveedor |
| 5 | confianza | asistencia, reputación y verificación con reglas antiabuso |
| 6 | notificaciones | recordatorios y cambios de estado con outbox/reintentos |
| 7 | mini campeonatos | equipos, fixture, resultados y tabla básica |
| 8 | comercios aliados | oferta cercana separada de reservas y condicionada a validación |

El frontend puede adelantarse como prototipo de uno o dos cortes, pero no como producto falso. Una
acción se habilita cuando existe contrato y backend; antes de eso debe marcarse `Próximamente`.

## 8. Plan técnico de estabilización

### Antes de continuar con nuevas funciones

1. recuperar ejecución limpia de pruebas Maven con el backend detenido;
2. añadir pruebas de revocación de OWNER, otro tenant y permisos por operación;
3. cerrar la prueba PostgreSQL concurrente del constraint de reservas;
4. medir y corregir la consulta pública de sedes;
5. definir ADR de BFF y ADR de operación de Keycloak en producción.

### Antes de beta cerrada

1. BFF/cookies y CSRF o aceptación formal del riesgo SPA;
2. CSP y cabeceras de borde;
3. rate limiting, auditoría ampliada y manejo uniforme de errores;
4. CI de seguridad, SBOM y escaneo de imágenes/dependencias;
5. staging con datos ficticios, secretos gestionados y TLS;
6. backup/restauración probado;
7. pruebas E2E de autorización, concurrencia y flujo móvil a 360 px.

### Antes de pagos reales

1. proveedor y contrato de webhook firmados;
2. `PaymentOrder` separado de reservas;
3. importe calculado en servidor, idempotencia y conciliación;
4. gestión de secretos, rotación y alertas;
5. política de cancelación, devolución, fraude y soporte;
6. revisión de privacidad y cumplimiento aplicable.

## 9. Estado de verificación de esta revisión

- frontend: typecheck, lint y build aprobados en la revisión visual previa;
- servicios locales: Inicio, catálogo y API pública respondieron correctamente;
- backend: la ejecución actual de `mvn test` está bloqueada por `target` parcialmente bloqueado por
  el backend en ejecución; `mvn clean test` no pudo eliminarlo. Debe repetirse con el backend
  detenido. No se atribuye un resultado de pruebas inexistente;
- no se encontraron secretos productivos mediante la búsqueda estática realizada, excluyendo
  deliberadamente el `.env` local;
- el flujo formal de Codex Security no pudo iniciarse porque el host no expuso la herramienta nativa
  de creación/finalización del escaneo. Los hallazgos anteriores son una revisión manual
  source-backed, no un reporte sellado de Codex Security.

## 10. Conclusión

La dirección es profesional y escalable para el MVP. No hace falta cambiar de stack ni migrar a
microservicios o Supabase. La prioridad es convertir la modularidad documentada en límites
comprobables, cerrar reservas extremo a extremo y endurecer sesión, consultas públicas, Keycloak,
CI y operación antes de exponer usuarios o pagos reales.
