# 14. Estrategia de calidad y pruebas

## Objetivo

Evitar que seguridad, concurrencia y reglas multicomplejo dependan de pruebas manuales.

## Pirámide de pruebas

| Nivel | Herramientas sugeridas | Cobertura |
|---|---|---|
| Unitarias | JUnit 5, AssertJ, Mockito | reglas puras y estados |
| Módulo | Spring Modulith Test | límites y eventos internos |
| Repositorio | Testcontainers PostgreSQL | constraints, consultas y tenants |
| API | MockMvc/RestAssured | contrato, validación y seguridad |
| Seguridad | spring-security-test | 401/403, roles, JWT y métodos |
| Contrato | OpenAPI validation | compatibilidad frontend/backend |
| Integración | Testcontainers/servicios simulados | DB, Keycloak, colas y storage |
| E2E | Playwright | flujos móviles críticos |
| Rendimiento | k6/Gatling | búsqueda, reserva y concurrencia |

## Casos críticos obligatorios

### Autorización

- sin token;
- token expirado, emisor/audiencia incorrecta;
- usuario correcto sin permiso;
- rol correcto en tenant incorrecto;
- membresía suspendida;
- elevación de rol no autorizada;
- acceso de soporte fuera de alcance.

### Reservas

- dos solicitudes simultáneas para el mismo horario;
- reintento con la misma idempotency key;
- cancelación en cada estado;
- zona horaria y cambios de fecha;
- actualización optimista conflictiva.

### Partidos

- máximo y mínimo de cupos;
- usuario duplicado;
- lista de espera y reemplazo;
- cancelación tardía;
- capitán intentando administrar otro partido.

### Pagos

- webhook repetido;
- firma inválida;
- importe diferente;
- devolución duplicada;
- transición de estado inválida.

## Calidad de código

- compilación reproducible;
- formatter y lint;
- análisis estático;
- cobertura enfocada en riesgo, no porcentaje aislado;
- revisión de dependencias y secretos;
- migraciones probadas desde versión anterior;
- ADR para cambios arquitectónicos.

## Puertas de CI

Un cambio no se despliega si:

- fallan pruebas;
- OpenAPI incompatible sin aprobación;
- existe secreto detectado;
- existe vulnerabilidad crítica explotable;
- migración no puede aplicarse en staging;
- controles de tenant fallan;
- smoke test posterior al despliegue falla.

## Criterio de terminado

Una historia está terminada cuando tiene:

- criterio de aceptación cumplido;
- pruebas positivas y negativas;
- autorización verificada;
- logs/metricas necesarios;
- documentación del API;
- migración reversible o procedimiento de recuperación;
- revisión de privacidad cuando incorpora datos nuevos.

