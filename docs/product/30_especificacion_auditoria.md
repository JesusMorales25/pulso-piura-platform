# 30. Especificación de auditoría

## Objetivo

Responder quién hizo qué, cuándo, sobre qué recurso, en qué organización y con qué resultado, sin convertir el log en una copia insegura de datos personales.

## Eventos obligatorios

### Identidad y acceso

- primer acceso/provisión;
- cuenta suspendida/reactivada;
- proveedor Google vinculado/desvinculado;
- cambio de rol global;
- acceso administrativo fallido repetido.

### Organizaciones

- creación/cambio de estado;
- invitación, activación, suspensión y revocación de membresía;
- asignación/revocación de rol;
- cambio de política.

### Reservas y pagos

- creación/confirmación/cancelación/reprogramación;
- override;
- cambio manual de precio;
- registro/conciliación/devolución de pago;
- intento de webhook inválido agregado, sin guardar secreto.

### Partidos y torneos

- publicación/cancelación;
- eliminación de participante;
- cambio manual de lista de espera;
- modificación de asistencia fuera de plazo;
- resultado aprobado/corregido;
- sanción aplicada/revocada.

### Datos y administración

- exportación;
- eliminación/anominización;
- acceso de soporte;
- cambio de configuración de seguridad;
- rotación/reemplazo de integración.

## Esquema

| Campo | Contenido |
|---|---|
| `event_id` | UUID |
| `occurred_at` | UTC |
| `actor_user_id` | nullable para sistema |
| `actor_type` | USER, SYSTEM, INTEGRATION |
| `organization_id` | tenant cuando aplique |
| `action` | código estable |
| `resource_type/id` | recurso afectado |
| `result` | SUCCESS, DENIED, FAILED |
| `reason_code` | código controlado |
| `correlation_id` | trazabilidad técnica |
| `source_ip_hash` | opcional, con retención limitada |
| `metadata_json` | mínimo y permitido por acción |

## Reglas

- append-only desde la aplicación;
- no permitir edición por administradores comunes;
- reloj confiable;
- controles de acceso separados;
- filtros por tenant;
- exportación auditada;
- retención definida por riesgo y obligación;
- proteger integridad mediante almacenamiento/controles adecuados al crecer.

## Datos prohibidos

- access/refresh tokens;
- códigos OTP;
- contraseñas;
- client secrets;
- payload completo de proveedor;
- captura de pago completa;
- motivo médico/personal sin necesidad;
- contenido íntegro de mensajes privados.

## Consulta

Roles autorizados ven:

- fecha;
- actor permitido;
- acción;
- recurso;
- resultado;
- motivo controlado.

Soporte no ve automáticamente todos los tenants. Acceso extraordinario requiere caso, duración y justificación.

## Alertas sobre auditoría

- múltiples denegaciones cross-tenant;
- asignación de rol privilegiado;
- override de reserva;
- devoluciones inusuales;
- exportaciones masivas;
- suspensión de muchos usuarios;
- fallos de integridad o escritura de auditoría.

