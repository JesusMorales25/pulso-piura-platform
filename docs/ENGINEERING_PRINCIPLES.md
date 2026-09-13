# Principios profesionales de ingeniería

## SOLID

- **SRP:** cada clase tiene un motivo principal de cambio. Controllers traducen HTTP, casos de uso orquestan, entidades protegen invariantes y adaptadores hablan con tecnologías.
- **OCP:** proveedores de identidad, pagos y notificaciones se incorporan mediante puertos y estrategias, sin reescribir el dominio.
- **LSP:** cada implementación respeta precondiciones, resultados y errores del contrato que implementa.
- **ISP:** interfaces pequeñas orientadas a casos de uso; evitar servicios generales con métodos no relacionados.
- **DIP:** dominio y aplicación no dependen de JPA, Keycloak, HTTP ni SDK de pasarela. Infraestructura depende de puertos internos.

## Reglas complementarias

- arquitectura por módulo de negocio;
- nombres por intención y métodos breves;
- DTOs separados de entidades persistentes;
- validación en el borde e invariantes en el dominio;
- configuración tipada y secretos externos;
- pruebas en cada nivel con mayor concentración en dominio/aplicación;
- observabilidad sin datos sensibles;
- deuda técnica explícita, nunca oculta.

Estas reglas forman parte de la Definition of Done y deben revisarse en cada cambio generado manualmente o con IA.
