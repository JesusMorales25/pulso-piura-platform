# 13. Contrato inicial de API

## Principios

- REST/JSON versionado en `/api/v1`;
- OpenAPI como contrato;
- UUID para recursos;
- fechas ISO 8601 en UTC;
- importes enteros en céntimos de sol;
- paginación por cursor cuando crezca el volumen;
- idempotencia para escrituras críticas;
- errores uniformes con `application/problem+json`;
- ninguna respuesta expone entidades JPA directamente.

## Recursos iniciales

### Identidad y perfil

| Método | Ruta | Propósito |
|---|---|---|
| GET | `/me` | identidad y capacidades actuales |
| GET | `/me/profile` | consultar perfil |
| PATCH | `/me/profile` | actualizar perfil |
| GET | `/me/memberships` | organizaciones y roles |

### Organizaciones y sedes

| Método | Ruta | Propósito |
|---|---|---|
| GET | `/organizations/{id}` | información permitida |
| GET | `/organizations/{id}/members` | miembros autorizados |
| POST | `/organizations/{id}/members` | invitar/asignar membresía |
| GET | `/venues` | buscar sedes públicas |
| POST | `/organizations/{id}/venues` | crear sede |
| GET | `/venues/{id}/spaces` | espacios deportivos |
| GET | `/spaces/{id}/availability` | disponibilidad calculada |

### Reservas

| Método | Ruta | Propósito |
|---|---|---|
| POST | `/reservations` | solicitar reserva |
| GET | `/reservations/{id}` | detalle autorizado |
| POST | `/reservations/{id}/confirm` | confirmar bajo regla |
| POST | `/reservations/{id}/cancel` | cancelar |
| POST | `/reservations/{id}/refunds` | iniciar devolución autorizada |

### Partidos

| Método | Ruta | Propósito |
|---|---|---|
| GET | `/matches` | explorar partidos publicados |
| POST | `/matches` | crear partido |
| GET | `/matches/{id}` | detalle público/privado |
| PATCH | `/matches/{id}` | editar como capitán autorizado |
| POST | `/matches/{id}/participants` | solicitar/unirse |
| DELETE | `/matches/{id}/participants/me` | salir/cancelar |
| POST | `/matches/{id}/participants/{userId}/attendance` | registrar asistencia |

### Pagos

| Método | Ruta | Propósito |
|---|---|---|
| POST | `/reservations/{id}/payment-orders` | crear una orden con importe calculado por backend |
| GET | `/payment-orders/{id}` | consultar estado autorizado |
| POST | `/payment-orders/{id}/attempts` | iniciar intento y obtener acción de pago del proveedor |
| POST | `/payment-orders/{id}/cancel` | cancelar una orden aún cancelable |
| POST | `/payment-orders/{id}/manual-evidence` | registrar evidencia solo para conciliación del piloto |
| POST | `/payment-provider/webhooks/{provider}` | recibir eventos autenticados de pasarela |
| POST | `/payment-orders/{id}/refunds` | solicitar devolución autorizada e idempotente |

El frontend nunca envía un estado `PAID` ni confirma una reserva. El backend consulta/valida al proveedor y ejecuta la transición correspondiente.

### Torneos

| Método | Ruta | Propósito |
|---|---|---|
| POST | `/tournaments` | crear torneo |
| GET | `/tournaments/{id}` | vista pública/privada |
| POST | `/tournaments/{id}/teams` | registrar equipo |
| POST | `/tournaments/{id}/fixtures/generate` | generar propuesta |
| PATCH | `/tournament-matches/{id}/result` | registrar resultado |
| POST | `/tournament-matches/{id}/result/approve` | aprobar resultado |

## Cabeceras

- `Authorization: Bearer ...` cuando el cliente llama directamente;
- `Idempotency-Key` en reservas, pagos, confirmaciones y devoluciones;
- `X-Correlation-Id` generado/propagado;
- `If-Match` para actualizaciones con control optimista cuando corresponda.

## Formato de error

```json
{
  "type": "https://api.example.com/problems/reservation-conflict",
  "title": "Horario no disponible",
  "status": 409,
  "detail": "El horario fue reservado por otra operación.",
  "instance": "/api/v1/reservations/...",
  "correlationId": "..."
}
```

No devolver stack traces, SQL, tokens o decisiones internas de autorización.

## Versionado

- cambios compatibles no crean nueva versión;
- campos nuevos son opcionales;
- eliminación o cambio semántico requiere deprecación;
- consumidores se prueban contra OpenAPI;
- la versión del frontend no sustituye el versionado del API.
