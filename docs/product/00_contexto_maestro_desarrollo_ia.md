# 0. Contexto maestro y reglas para desarrollo asistido por IA

## Finalidad

Este documento es la autoridad de contexto para cualquier persona o IA que analice, diseñe, programe, pruebe o modifique el proyecto. Debe incluirse o referenciarse en todas las tareas de desarrollo.

Si una instrucción puntual contradice esta línea base, la IA debe detenerse, explicar la contradicción y solicitar una decisión. No debe cambiar arquitectura, seguridad o alcance silenciosamente.

## Contexto del producto

La solución es una plataforma SaaS y marketplace deportivo multicomplejo, inicialmente para Piura. No es software a medida para una empresa.

El producto conecta:

- jugadores que buscan participar;
- capitanes que organizan partidos;
- complejos que administran espacios y reservas;
- organizadores que gestionan mini campeonatos;
- operadores que brindan soporte y moderación.

La propuesta principal es ayudar a que un partido ocurra:

> Crear partido → invitar → completar cupos → confirmar participantes/pagos → reservar cancha → jugar → registrar asistencia.

## Alcance funcional base

1. Identidad, sesiones y perfiles.
2. Organizaciones, sedes y espacios deportivos.
3. Disponibilidad y reservas.
4. Partidos, cupos, participantes y lista de espera.
5. Registro y conciliación futura de pagos.
6. Mini campeonatos, equipos, fixture y resultados.
7. Notificaciones.
8. Moderación y reputación de cumplimiento.
9. Auditoría y administración.
10. Analítica operativa y de producto.

## Arquitectura aprobada

| Capa | Decisión |
|---|---|
| Frontend | Next.js + React + TypeScript, móvil primero/PWA |
| Backend | Java + Spring Boot, monolito modular |
| Identidad | Keycloak mediante OAuth 2.0/OpenID Connect |
| Login social | Google federado a través de Keycloak |
| Seguridad | Spring Security Resource Server + Method Security |
| Datos | PostgreSQL + Flyway |
| Integración | API REST/JSON + OpenAPI |
| Pruebas | JUnit, Testcontainers, Spring Security Test, Playwright |
| Despliegue | Docker y ambientes separados |
| Archivos | almacenamiento compatible con S3 |
| Caché/colas | Redis solo con necesidad demostrada |

No introducir microservicios, GraphQL, Supabase Auth, Firebase Auth u otro stack sin una ADR aprobada.

## Organización del backend

El código se divide por módulos de negocio, no por carpetas globales de controllers/services/repositories.

```text
com.product.sports
├── identity
├── profiles
├── organizations
├── venues
├── reservations
├── matches
├── payments
├── tournaments
├── notifications
├── moderation
├── audit
└── shared
```

Dentro de cada módulo:

```text
module
├── api             # controllers, request/response DTOs
├── application     # casos de uso y puertos
├── domain          # entidades, value objects y reglas
└── infrastructure  # JPA, integraciones y configuración
```

Reglas:

- el dominio no depende de controllers ni proveedores externos;
- un módulo no accede directamente a tablas/repositorios internos de otro;
- la comunicación utiliza interfaces públicas o eventos internos;
- `shared` contiene solo elementos realmente transversales;
- evitar una carpeta `utils` sin responsabilidad clara.

## Organización del frontend

```text
src
├── app
├── features
│   ├── auth
│   ├── profiles
│   ├── venues
│   ├── reservations
│   ├── matches
│   └── tournaments
├── components
├── lib
├── api
└── styles
```

- componentes de dominio dentro de su feature;
- componentes genéricos y accesibles en `components`;
- cliente API generado o tipado desde OpenAPI;
- validación con esquemas compartidos en el frontend;
- ninguna regla de autorización existe únicamente en UI.

## Reglas innegociables de seguridad

1. Denegar por defecto.
2. Validar token, emisor, audiencia, firma y expiración.
3. Toda escritura valida permiso y tenant en backend.
4. No confiar en roles enviados por el cliente.
5. No guardar access/refresh tokens en `localStorage`.
6. No registrar tokens, OTP, contraseñas, secretos o capturas completas.
7. No exponer entidades JPA directamente.
8. Reservas y pagos críticos son idempotentes.
9. Doble reserva se evita en base de datos y transacción, no solo en código.
10. Cambios sensibles generan auditoría.
11. Archivos se validan por contenido, tipo y tamaño.
12. Una cuenta de otro complejo nunca puede leer o modificar recursos ajenos.

## Identidad, perfil y permisos

- Keycloak conserva credenciales, sesión, MFA e identidades federadas.
- Google es un proveedor externo; no es la identidad primaria del dominio.
- `sub` de Keycloak es la referencia estable en `users.identity_subject`.
- el perfil deportivo vive en PostgreSQL.
- roles por organización viven en memberships/roles/permissions.
- el JWT puede contener scopes globales; el backend valida contexto vigente.

## Reglas de datos

- UUID para identificadores públicos;
- dinero como entero en unidad mínima;
- instantes en UTC, presentación en `America/Lima`;
- migraciones Flyway versionadas e inmutables después de publicarse;
- claves foráneas y constraints para invariantes;
- borrado lógico solo cuando existe motivo de trazabilidad;
- datos personales mínimos y con finalidad documentada;
- no usar datos reales de producción en desarrollo o pruebas.

## Reglas de API

- prefijo `/api/v1`;
- contrato OpenAPI actualizado con el código;
- DTOs distintos de entidades;
- errores `application/problem+json`;
- 400 para entrada inválida, 401 no autenticado, 403 no autorizado, 404 no encontrado, 409 conflicto;
- paginación en colecciones no acotadas;
- `Idempotency-Key` para reservas, pagos y devoluciones;
- correlation ID en trazas;
- no filtrar stack traces o detalles internos.

## Reglas de desarrollo

- implementar solo la historia o módulo solicitado;
- no agregar funciones “por si acaso”;
- mantener compatibilidad salvo que la tarea autorice ruptura;
- preferir código claro antes que abstracciones prematuras;
- no duplicar lógica de negocio;
- documentar decisiones relevantes mediante ADR;
- no editar migraciones aplicadas; crear una nueva;
- no agregar dependencia sin justificar necesidad, licencia y riesgo;
- no desactivar controles para hacer pasar pruebas;
- no hacer commits ni despliegues salvo autorización explícita.

## Pruebas obligatorias

Toda funcionalidad debe incluir:

- caso exitoso;
- validaciones de entrada;
- transición de estado inválida;
- usuario no autenticado;
- usuario sin permiso;
- usuario con rol correcto en otro tenant;
- persistencia/integridad cuando corresponda;
- concurrencia e idempotencia para reservas/pagos;
- actualización del contrato API.

## Definition of Done

Una tarea está terminada únicamente cuando:

- cumple criterios de aceptación;
- respeta el módulo y arquitectura;
- tiene pruebas positivas y negativas;
- autorización y aislamiento fueron verificados;
- migraciones y OpenAPI están actualizados;
- no introduce vulnerabilidades críticas conocidas;
- logs y métricas necesarios están presentes;
- documentación afectada fue actualizada;
- se indican supuestos, riesgos y trabajo pendiente.

## Prohibiciones para una IA

La IA no debe:

- inventar requisitos o decisiones comerciales;
- reemplazar Keycloak/Spring Security por autenticación casera;
- confiar en autorización del frontend;
- agregar microservicios sin ADR;
- generar secretos reales o incluirlos en archivos;
- usar `ddl-auto=create/update` en producción;
- devolver información de otros tenants;
- almacenar dinero en `float`/`double`;
- aceptar capturas como pago confirmado automático;
- marcar una tarea como terminada sin ejecutar pruebas relevantes;
- ocultar fallos o reducir seguridad para completar más rápido.

## Procedimiento antes de desarrollar

La IA debe:

1. leer este documento y los documentos del módulo;
2. revisar código y decisiones existentes;
3. resumir objetivo, alcance y criterios;
4. identificar contradicciones o información faltante;
5. proponer cambios concretos y archivos afectados;
6. implementar el mínimo completo;
7. ejecutar pruebas;
8. informar resultado, riesgos y siguientes pasos.

## Fuentes de verdad en orden

1. solicitud actual explícita del responsable del producto;
2. decisiones aceptadas en `09_registro_decisiones.md`;
3. este contexto maestro;
4. requisitos y criterios aprobados;
5. arquitectura, seguridad y contratos;
6. código y pruebas existentes;
7. supuestos documentados.

Una contradicción entre fuentes 1–5 requiere decisión; no se resuelve silenciosamente.

