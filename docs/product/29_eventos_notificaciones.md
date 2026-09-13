# 29. Catálogo de eventos y notificaciones

## Principios

- eventos de dominio describen hechos pasados;
- notificaciones son consecuencias, no parte de la transacción principal;
- commit antes de enviar;
- reintentos idempotentes;
- preferencias respetadas salvo comunicaciones operativas/legales obligatorias;
- no incluir datos sensibles innecesarios.

## Catálogo inicial

| Evento | Productor | Consumidores principales |
|---|---|---|
| `UserProvisioned` | identity | profiles, audit |
| `MembershipInvited` | organizations | notifications, audit |
| `MembershipRevoked` | organizations | identity/session handling, audit |
| `VenuePublished` | venues | search, audit |
| `ReservationHeld` | reservations | notifications, expiration scheduler |
| `ReservationConfirmed` | reservations | notifications, matches, audit |
| `ReservationCancelled` | reservations | notifications, payments, audit |
| `ReservationExpired` | reservations | notifications, availability |
| `MatchPublished` | matches | notifications/search |
| `ParticipantJoined` | matches | notifications, audit |
| `ParticipantCancelled` | matches | waitlist, notifications |
| `WaitlistPromoted` | matches | notifications |
| `MatchConfirmed` | matches | notifications |
| `AttendanceRecorded` | matches | reputation, audit |
| `PaymentRecorded` | payments | reservations/matches, audit |
| `PaymentConfirmed` | payments | reservations/matches, notifications |
| `PaymentFailed` | payments | notifications, expiration handling |
| `PaymentExpired` | payments | reservations, availability, notifications |
| `PaymentReconciliationRequired` | payments | operations, audit |
| `RefundRequested` | payments | operations/provider adapter, audit |
| `RefundCompleted` | payments | reservations, notifications, audit |
| `TournamentPublished` | tournaments | notifications/search |
| `ResultApproved` | tournaments | table, notifications, audit |
| `ReportSubmitted` | moderation | moderation queue, audit |
| `UserSuspended` | moderation | identity/session, notifications, audit |

## Notificaciones al usuario

| Código | Canal inicial | Obligatoria |
|---|---|---|
| `AUTH_ACCOUNT_CREATED` | email/in-app | Sí |
| `MEMBERSHIP_INVITATION` | email/in-app | Sí |
| `RESERVATION_HOLD_CREATED` | in-app/email | Sí |
| `RESERVATION_CONFIRMED` | WhatsApp/email/in-app | Sí |
| `RESERVATION_CANCELLED` | WhatsApp/email/in-app | Sí |
| `MATCH_JOIN_CONFIRMED` | in-app/WhatsApp | Sí |
| `MATCH_WAITLISTED` | in-app | Sí |
| `MATCH_WAITLIST_PROMOTED` | WhatsApp/in-app | Sí |
| `MATCH_REMINDER_24H` | WhatsApp/in-app | Configurable |
| `MATCH_CHANGED` | WhatsApp/in-app | Sí |
| `PAYMENT_STATUS_CHANGED` | in-app/email | Sí |
| `TOURNAMENT_FIXTURE_PUBLISHED` | in-app/email | Configurable |
| `SECURITY_ROLE_CHANGED` | email/in-app | Sí |
| `SECURITY_NEW_ACCOUNT_LINKED` | email/in-app | Sí |

## Estados de entrega

```text
PENDING → PROCESSING → SENT
                    └→ RETRY_SCHEDULED → FAILED
                                  └────→ DEAD_LETTER
```

## Plantillas

Cada plantilla tiene:

- código y versión;
- idioma;
- canal;
- asunto/texto;
- variables permitidas;
- clasificación operativa/marketing;
- previsualización y aprobación.

No permitir variables arbitrarias que inyecten HTML o secretos.

## WhatsApp

- usar proveedor autorizado y plantillas aprobadas cuando corresponda;
- consentimiento/finalidad documentados;
- salida opt-out para marketing;
- comunicaciones transaccionales separadas;
- registrar estado, no contenido sensible completo;
- degradar a email/in-app ante fallo según criticidad.

## Outbox

Antes de integraciones críticas se implementará transactional outbox:

1. caso de uso modifica agregado;
2. guarda evento en outbox en la misma transacción;
3. worker publica;
4. consumidor usa event ID idempotente;
5. se registran reintentos y fallo definitivo.
