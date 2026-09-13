# 5. Modelo de datos conceptual

## Entidades principales

| Entidad | Propósito |
|---|---|
| User | identidad, celular, estado y consentimiento |
| PlayerProfile | preferencias deportivas y zona |
| Organization | complejo, club, empresa o entidad organizadora |
| Membership | relación usuario-organización y rol |
| Venue | sede física |
| SportSpace | cancha o espacio reservable |
| AvailabilityRule | horario regular, excepción y precio |
| Reservation | bloqueo y reserva de un espacio |
| Match | partido creado por un capitán u organización |
| MatchParticipant | cupo, estado, asistencia y rol en partido |
| WaitlistEntry | prioridad de reemplazo |
| PaymentOrder | obligación de pago asociada a una reserva, partido o torneo |
| PaymentTransaction | intento/movimiento de proveedor, con método, referencia y estado |
| PaymentReconciliation | resultado de conciliación automática o manual |
| Refund | devolución total o parcial sin alterar la transacción original |
| Tournament | configuración de campeonato |
| Team | equipo participante |
| TeamMember | plantilla del equipo |
| TournamentMatch | encuentro del fixture |
| Result | marcador y validación |
| Notification | mensaje, canal, estado y reintentos |
| Report | denuncia o incidencia |
| AuditEvent | evento sensible y responsable |

## Relaciones clave

```text
User 1──1 PlayerProfile
User N──N Organization (mediante Membership)
Organization 1──N Venue 1──N SportSpace
SportSpace 1──N Reservation
User 1──N Match (como capitán)
Match 1──N MatchParticipant N──1 User
Match 1──N WaitlistEntry
Reservation 0..1──1 Match
PaymentOrder 1──N PaymentTransaction
PaymentTransaction 0──N PaymentReconciliation
PaymentOrder 0──N Refund
Tournament 1──N Team 1──N TeamMember
Tournament 1──N TournamentMatch
TournamentMatch 1──1 Result
```

## Campos sensibles

- número telefónico;
- nombre y fotografía, si se incorpora;
- ubicación aproximada o preferida;
- historial de pagos;
- reputación y reportes;
- evidencias de pago;
- datos de menores, si en el futuro se admiten.

## Reglas de integridad

- restricciones únicas para horarios confirmados;
- estados controlados mediante enumeraciones o tablas de referencia;
- claves foráneas y borrado restringido para operaciones financieras;
- historial de cambios para reservas, pagos, sanciones y resultados;
- eliminación lógica cuando deba preservarse trazabilidad;
- índices por tenant, fecha, estado y ubicación operativa.

## Retención propuesta

Los plazos definitivos requieren revisión legal:

- sesiones y códigos OTP: mínimos necesarios;
- logs técnicos: plazo corto y acceso restringido;
- evidencias de pago: según obligación operativa/tributaria;
- auditoría: según riesgo y necesidad de resolución;
- perfiles inactivos: revisión y eliminación programada;
- datos analíticos: preferentemente agregados o seudonimizados.
