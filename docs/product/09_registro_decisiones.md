# 9. Registro de decisiones

## Decisiones adoptadas

| ID | Fecha | Decisión | Motivo | Estado |
|---|---|---|---|---|
| DEC-001 | 2026-08-31 | Construir un producto SaaS propio | Evitar software a medida y facilitar escalabilidad | Aceptada |
| DEC-002 | 2026-08-31 | La reserva será una capacidad, no toda la propuesta | La diferenciación es organizar y completar partidos | Aceptada |
| DEC-003 | 2026-08-31 | Web móvil/PWA antes que apps nativas | Menor fricción y costo inicial | Aceptada |
| DEC-004 | 2026-08-31 | Monolito modular en Spring Boot para el MVP | Aprovecha experiencia Java y reduce complejidad manteniendo separación | Aceptada |
| DEC-005 | 2026-08-31 | Multi-tenancy desde el modelo inicial | El producto atenderá múltiples complejos | Aceptada |
| DEC-006 | 2026-08-31 | Seguridad y privacidad desde el diseño | Se manejarán identidad, pagos y reputación | Aceptada |
| DEC-007 | 2026-08-31 | Encuestas para requisitos adicionales | La visión se define internamente; la investigación prioriza | Aceptada |
| DEC-008 | 2026-08-31 | Next.js + TypeScript para el frontend web/PWA | Madurez, páginas públicas, experiencia móvil y ecosistema | Aceptada |
| DEC-009 | 2026-08-31 | Keycloak/OIDC para identidad y Spring Security para autorización | Evita autenticación casera y conserva reglas de negocio en Java | Aceptada |
| DEC-010 | 2026-08-31 | Roles contextuales en la base del producto | Un usuario puede tener roles distintos por organización | Aceptada |
| DEC-011 | 2026-08-31 | Google como proveedor social federado en Keycloak | Simplifica registro manteniendo un único emisor para Spring Boot | Aceptada |
| DEC-012 | 2026-08-31 | Contexto maestro obligatorio para desarrollo asistido por IA | Evita desviaciones de arquitectura, alcance y seguridad | Aceptada |
| DEC-013 | 2026-09-01 | Incorporar Yape y Plin mediante una capa de pagos desacoplada | Permite cambiar de pasarela y conservar reglas de negocio, trazabilidad y escalabilidad | Aceptada |
| DEC-014 | 2026-09-01 | Confirmar pagos solo por respuesta autenticada del proveedor o conciliación operativa | Una captura, código escrito o retorno del navegador no demuestra liquidación | Aceptada |
| DEC-015 | 2026-09-01 | Pilotar cobros manuales conciliados antes de contratar la automatización completa | Valida demanda y operación sin convertir la contingencia manual en arquitectura definitiva | Aceptada |
| DEC-016 | 2026-09-04 | Incorporar por fases los aportes reutilizables de `Requerimientos.docx` | Evita duplicación y protege el núcleo del MVP frente a CRM, publicidad e integraciones prematuras | Aceptada |
| DEC-017 | 2026-09-04 | El pase QR será opaco y no demostrará pago | Reduce exposición de datos y evita usar el comprobante como autoridad financiera | Aceptada |
| DEC-018 | 2026-09-04 | CRM, marketing y comercios aliados requieren consentimiento y módulos separados | Protege privacidad, autorización multi-tenant y evolución independiente | Aceptada |

## Decisiones pendientes

| ID | Tema | Opciones | Evidencia necesaria |
|---|---|---|---|
| PEN-001 | Marca comercial | nombre nuevo y registrable | búsqueda de marca, dominios y usuarios |
| PEN-002 | Operación de Keycloak | autogestionado vs. proveedor OIDC administrado | costo, operación y disponibilidad |
| PEN-003 | Canal de acceso | correo, celular/OTP o ambos | costo, entrega, experiencia y seguridad |
| PEN-004 | Proveedor de pagos | Culqi, Niubiz, Izipay u otro adquirente habilitado | soporte real de Yape/QR interoperable, API, webhook, devolución, split, costos y contrato |
| PEN-005 | Torneos en MVP | incluir vs. segunda fase | encuestas y pilotos próximos |
| PEN-006 | Modelo comercial | comisión, SaaS o híbrido | disposición de pago y economía unitaria |
| PEN-007 | Política de cancelación | configurable con límites | preferencias y riesgo operativo |
| PEN-008 | Menores de edad | excluir inicialmente vs. controles reforzados | revisión legal y estrategia |
| PEN-009 | Reservas recurrentes | serie completa vs. generación acotada | operación real, conflictos y cancelaciones |
| PEN-010 | Comercios aliados | suscripción, campaña o comisión | demanda, categorías permitidas, métricas y disposición de pago |

## Plantilla para decisiones futuras

```text
ID:
Fecha:
Responsable:
Contexto:
Decisión:
Alternativas consideradas:
Consecuencias:
Evidencia:
Estado: propuesta | aceptada | reemplazada
```

## DEC-2026-09-07 — Reserva exclusiva y pagos de prueba

Estado: aceptada por el usuario en la conversación de implementación.

Se confirma bloqueo exclusivo al iniciar el checkout, adelanto del 25% o pago completo por Yape/Plin en simulación, cancelación del jugador hasta 2 horas antes y retención íntegra sin devoluciones. El dueño solo cancela reservas sin pagos, a cualquier hora. Cobros reales deshabilitados hasta contratar e integrar un proveedor. Detalle y verificación en [RESERVATIONS_PAYMENTS.md](../RESERVATIONS_PAYMENTS.md). Esta decisión concreta PEN-007 para el flujo actual.

## DEC-2026-09-09 — Consola global, capacidades y directorio de aliados

Estado: aceptada por el usuario en la conversación de implementación.

El rol global `PLATFORM_ADMIN` administra solicitudes de organizador y dueño de cancha, puede revocar capacidades y asignar o retirar dueños contextuales conservando al menos uno por organización. También administra el directorio público de choperías, restaurantes y aliados. Los cambios de propietarios y capacidades quedan auditados. Los datos visibles de jugadores usan el nombre y la foto federada de Google o la preferencia del perfil; la vista pública de participantes respeta `visibility = PUBLIC`.

Los negocios aliados se guardan primero como borrador y solo pueden publicarse cuando tienen dirección y teléfono de contacto. La configuración visible usa direcciones legibles y permite comprobarlas en Google Maps; las coordenadas son un detalle técnico opcional que no se expone en los formularios. El directorio público consume exclusivamente registros `PUBLISHED` de la base de datos y genera accesos seguros a WhatsApp y Google Maps. Las sedes deportivas usan el mismo criterio de contacto y ruta con los datos públicos que registra el dueño del complejo.

La ubicación exacta de un negocio puede registrarse pegando el enlace obtenido mediante **Compartir** en Google Maps. La plataforma conserva ese destino y lo usa directamente en “Cómo llegar”, sin consumir Google Places ni requerir una clave de pago. El backend acepta exclusivamente enlaces HTTPS de dominios oficiales de Google Maps.
