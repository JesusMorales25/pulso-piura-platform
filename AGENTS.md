# Contexto obligatorio para desarrollo asistido

## Índice operativo

Antes de hacer búsquedas amplias, leer `docs/CODEBASE_INDEX.md` y usar su tabla de enrutamiento
para limitar la exploración al módulo afectado. Regenerarlo con
`powershell -ExecutionPolicy Bypass -File scripts/update-codebase-index.ps1` después de cambiar
rutas, módulos, controladores, migraciones o scripts. El índice acelera la navegación, pero no
reemplaza los documentos obligatorios ni los ADR aplicables.

Antes de modificar código, leer `docs/product/AGENTS.template.md`, `docs/product/01_vision_y_alcance.md`, `docs/product/20_modulos_springboot.md`, `docs/product/22_plan_implementacion.md` y los ADR aplicables.

Reglas invariables:

1. Este es un producto SaaS multicomplejo, no software a medida.
2. La primera experiencia es web responsive mobile-first; no crear una app nativa.
3. Backend Java/Spring Boot como monolito modular; frontend Next.js/TypeScript.
4. Keycloak es el proveedor OIDC; Spring Security valida tokens y aplica autorización de negocio.
5. Todo acceso de organización debe validar pertenencia y alcance; nunca confiar en un `orgId` enviado por el cliente.
6. No almacenar secretos, tokens, contraseñas ni credenciales de Google o pagos en Git.
7. Reservas y pagos requieren idempotencia, auditoría y estados explícitos.
8. Yape/Plin deben entrar por una abstracción de proveedor con confirmación verificable.
9. No agregar funciones fuera del backlog activo sin actualizar requisitos y decisión.
10. Cada cambio incluye pruebas proporcionales, migración versionada cuando altere datos y documentación relevante.
11. Aplicar SOLID: responsabilidad única, extensión sin modificación innecesaria, sustitución segura, interfaces pequeñas e inversión de dependencias.
12. Controllers coordinan HTTP; casos de uso coordinan aplicación; el dominio protege reglas; adaptadores implementan puertos. Ninguna capa asume responsabilidades de otra.
13. Evitar clases multipropósito, dependencias hacia infraestructura desde dominio/aplicación, métodos extensos y abstracciones genéricas sin necesidad.
14. El código debe ser legible, formateado y nombrado por intención; no comprimir implementaciones para reducir líneas.
