# 3. Requisitos del producto

## Convenciones

- `MUST`: indispensable para operar el MVP.
- `SHOULD`: importante, puede entrar después del núcleo.
- `COULD`: oportunidad futura.
- Estado inicial: `PROPUESTO`; cambiará a `VALIDADO`, `DESCARTADO` o `POSTERGADO`.

## Requisitos funcionales

| ID | Prioridad | Requisito | Criterio básico de aceptación |
|---|---|---|---|
| RF-001 | MUST | Registro e inicio mediante celular | El usuario recibe/verifica un código y accede |
| RF-002 | MUST | Perfil deportivo | Guarda deportes, nivel, posición y zona |
| RF-003 | MUST | Crear partido | Registra fecha, modalidad, cupos, costo y ubicación |
| RF-004 | MUST | Compartir partido | Genera enlace utilizable en WhatsApp |
| RF-005 | MUST | Unirse a partido | Evita sobrepasar el máximo de cupos |
| RF-006 | MUST | Confirmaciones y lista de espera | Reemplaza un cupo liberado sin duplicidad |
| RF-007 | MUST | Control de asistencia | Capitán registra asistió, canceló o ausente |
| RF-008 | MUST | Registro de pagos | Muestra estado pendiente, parcial o pagado |
| RF-009 | MUST | Gestión de complejos | Administra sedes, canchas, deportes y reglas |
| RF-010 | MUST | Disponibilidad y reservas | Bloquea horarios confirmados |
| RF-011 | MUST | Roles y permisos | Cada actor accede solo a funciones autorizadas |
| RF-012 | MUST | Notificaciones | Envía eventos críticos y recordatorios |
| RF-013 | MUST | Auditoría básica | Registra cambios sensibles con actor y fecha |
| RF-014 | SHOULD | Partidos recomendados | Filtra por deporte, zona, nivel y horario |
| RF-015 | SHOULD | Horas valle/promociones | Complejo publica disponibilidad especial |
| RF-016 | SHOULD | Reputación de cumplimiento | Calcula asistencia y cancelaciones, no habilidad |
| RF-017 | SHOULD | Torneos: equipos e inscripciones | Registra cupos, plantillas y estado de pago |
| RF-018 | SHOULD | Torneos: fixture y tabla | Genera partidos y actualiza posiciones |
| RF-019 | SHOULD | Reportes operativos | Ocupación, reservas, cancelaciones y recurrencia |
| RF-020 | COULD | Integración automática de pagos | Confirma transacciones mediante proveedor autorizado |
| RF-021 | SHOULD | Amenidades y superficies | Publica características mediante catálogos controlados y filtros reutilizables |
| RF-022 | SHOULD | Reservas recurrentes | Crea series sin omitir validación de disponibilidad por ocurrencia |
| RF-023 | SHOULD | Pase digital QR | Permite check-in con identificador opaco, vencimiento y auditoría |
| RF-024 | MUST | Reglas de quórum | Confirma o cancela partidos según mínimo y plazo configurados |
| RF-025 | SHOULD | Historial unificado | Jugador y organización consultan reservas según su alcance |
| RF-026 | SHOULD | Reportes financieros operativos | Desglosa ingresos, ocupación y métodos sin sustituir contabilidad oficial |
| RF-027 | COULD | Promociones y cupones | Aplica beneficios con vigencia, alcance y límites de uso |
| RF-028 | COULD | CRM derivado y consentido | Segmenta actividad mediante reglas transparentes sin duplicar perfiles |
| RF-029 | COULD | Sincronización de calendario | Exporta ICS y opcionalmente sincroniza Google Calendar de forma revocable |
| RF-030 | COULD | Estadísticas ampliadas de torneo | Gestiona goleadores y tarjetas después del torneo básico |
| RF-031 | COULD | Cartelera de eventos | Publica actividades especiales separadas de partidos y torneos |
| RF-032 | COULD | Comercios aliados | Publica campañas locales y mide clics agregados bajo políticas de contenido |

## Requisitos no funcionales

| ID | Categoría | Requisito inicial |
|---|---|---|
| RNF-001 | Usabilidad | Flujo de unirse a partido en máximo 3 minutos |
| RNF-002 | Compatibilidad | Diseño móvil primero y navegadores modernos |
| RNF-003 | Rendimiento | 95% de solicitudes comunes por debajo de 800 ms en backend, excluyendo terceros |
| RNF-004 | Disponibilidad | Objetivo inicial mensual de 99,5% |
| RNF-005 | Escalabilidad | Servicios sin estado y base preparada para múltiples ciudades |
| RNF-006 | Seguridad | Autenticación, autorización, cifrado y auditoría |
| RNF-007 | Privacidad | Minimización, consentimiento y eliminación controlada |
| RNF-008 | Recuperación | Copias automáticas y procedimiento de restauración probado |
| RNF-009 | Observabilidad | Logs estructurados, métricas y alertas |
| RNF-010 | Mantenibilidad | Arquitectura modular, pruebas y despliegue automatizado |
| RNF-011 | Accesibilidad | Contraste, etiquetas y navegación compatibles con WCAG 2.1 AA como objetivo |
| RNF-012 | Localización | Zona horaria America/Lima y moneda PEN |

## Requisitos sujetos a validación

- tolerancia de pago por jugador;
- necesidad de búsqueda de rivales completos;
- importancia de niveles y posiciones;
- reglas de cancelación y reembolso;
- necesidad de torneos antes o después del matching;
- confirmación manual versus automática de Yape/Plin;
- información que necesitan los complejos en sus reportes;
- aceptación de partidos mixtos o segmentados;
- canales de notificación preferidos;
- datos mínimos para generar confianza.
- demanda real de reservas recurrentes y forma de resolver conflictos;
- utilidad del pase QR para los complejos;
- consentimiento y valor de comunicaciones promocionales;
- necesidad de sincronización con calendarios externos;
- disposición de pago de comercios aliados y aceptación de recomendaciones post-partido.

## Restricciones para requisitos incorporados

- las amenidades, superficies y modalidades se modelan como catálogos del producto, no campos exclusivos por cliente;
- el QR no contiene datos personales ni confirma un pago;
- el CRM es una vista derivada por tenant y no duplica el perfil global;
- ninguna comunicación comercial se envía sin consentimiento y mecanismo de exclusión;
- los precios de publicidad se validan comercialmente y no se codifican como constantes;
- la publicidad y sus cobros permanecen desacoplados de reservas y pagos deportivos.

## Criterio para nuevos requisitos

Cada solicitud se puntuará de 1 a 5 en:

1. frecuencia en distintos usuarios;
2. impacto en el problema principal;
3. alineación con la visión;
4. efecto en ingresos o retención;
5. riesgo legal/operativo;
6. esfuerzo técnico.

No se compromete una fecha durante una entrevista o encuesta.
