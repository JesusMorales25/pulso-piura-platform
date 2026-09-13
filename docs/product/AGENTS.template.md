# AGENTS.md — Reglas obligatorias del proyecto

Antes de analizar o modificar código, lee completamente:

1. `docs/00_contexto_maestro_desarrollo_ia.md`
2. `docs/09_registro_decisiones.md`
3. los requisitos y documentación del módulo afectado
4. el código y las pruebas existentes

## Stack aprobado

- Backend: Java + Spring Boot, monolito modular.
- Frontend: Next.js + React + TypeScript, móvil primero/PWA.
- Identidad: Keycloak/OIDC con Google federado.
- Autorización: Spring Security + permisos contextuales en PostgreSQL.
- Datos: PostgreSQL + Flyway.
- API: REST/JSON + OpenAPI.
- Pruebas: JUnit, Testcontainers, Spring Security Test y Playwright.

## Reglas

- No cambies arquitectura o stack sin una ADR aprobada.
- Aplica SOLID y responsabilidad única en módulos, clases y métodos.
- Usa inversión de dependencias: aplicación y dominio definen puertos; infraestructura los implementa.
- Mantén interfaces cohesionadas y pequeñas; no obligues a consumidores a depender de operaciones que no usan.
- Prefiere composición y contratos estables; una implementación debe poder sustituirse sin cambiar el comportamiento esperado.
- Extiende mediante nuevos adaptadores o estrategias cuando corresponda, sin condicionales crecientes sobre proveedores.
- No construyas autenticación propia ni aceptes tokens de Google directamente en Spring Boot.
- No confíes en autorización del frontend.
- Toda operación valida permiso, tenant, recurso y estado en backend.
- No expongas entidades JPA ni información de otro tenant.
- No guardes tokens en `localStorage` ni secretos en el repositorio.
- Dinero se representa como entero en unidad mínima.
- Fechas se almacenan en UTC y se muestran en `America/Lima`.
- Reservas/pagos críticos requieren transacción e idempotencia.
- No edites migraciones Flyway aplicadas; crea una nueva.
- Implementa solo el alcance solicitado.
- Agrega pruebas positivas, negativas, de autorización y tenant.
- Actualiza OpenAPI y documentación afectada.
- No marques la tarea como terminada si las pruebas relevantes no pasaron.

## Antes de implementar

Expón brevemente:

- contexto comprendido;
- alcance y fuera de alcance;
- archivos previstos;
- riesgos;
- pruebas previstas.

Si existe una contradicción o falta una decisión que cambie seguridad, datos o arquitectura, detente y solicita dirección.

## Entrega

Informa:

- resultado;
- archivos modificados;
- pruebas ejecutadas;
- validación de seguridad y tenant;
- migraciones/API;
- supuestos y pendientes.
