# 25. Reglas de reservas, cancelaciones y devoluciones

## Clasificación de reglas

- `INV`: invariante de plataforma, no configurable.
- `CFG`: configurable por organización dentro de límites.
- `HYP`: hipótesis que debe validarse antes de producción.

## Creación y disponibilidad

| ID | Tipo | Regla |
|---|---|---|
| RES-001 | INV | Una cancha no admite reservas bloqueantes superpuestas |
| RES-002 | INV | Inicio debe ser anterior al fin |
| RES-003 | INV | Precio e importe se calculan/validan en backend |
| RES-004 | INV | Reintentos con misma idempotency key no crean duplicados |
| RES-005 | CFG | Duración de slot según cancha, dentro de límites de plataforma |
| RES-006 | CFG | Anticipación mínima y máxima para reservar |
| RES-007 | CFG | Adelanto requerido por franja/cancha |

## HOLD

Estado temporal que bloquea una franja durante confirmación.

| ID | Tipo | Regla |
|---|---|---|
| RES-010 | INV | Todo HOLD tiene `expires_at` |
| RES-011 | INV | HOLD vencido no puede confirmarse sin revalidar disponibilidad |
| RES-012 | INV | Liberación es idempotente |
| RES-013 | HYP | Duración inicial sugerida: 10 minutos |
| RES-014 | INV | El retorno exitoso del navegador no confirma el pago |
| RES-015 | INV | Solo webhook autenticado, consulta al proveedor o conciliación autorizada confirma el pago |
| RES-016 | INV | Un evento duplicado del proveedor no duplica cobro ni confirmación |
| RES-017 | CFG | Métodos habilitados por complejo según cuenta comercial y proveedor contratado |

## Estados y transiciones

```text
HOLD → PENDING_PAYMENT → CONFIRMED → COMPLETED
  └──────────→ EXPIRED
PENDING_PAYMENT/CONFIRMED → CANCELLED
CONFIRMED/CANCELLED → REFUND_PENDING → REFUNDED
```

No se permiten saltos no definidos. Toda transición registra actor, fecha, motivo y estado anterior/nuevo.

## Cancelación

Variables de política:

- horas restantes;
- origen de cancelación;
- existencia de pago/adelanto;
- posibilidad de reemplazo/reprogramación;
- condiciones meteorológicas o indisponibilidad del complejo;
- historial de excepciones.

### Matriz propuesta para validar

| Escenario | Resultado propuesto |
|---|---|
| Complejo cancela | reprogramación o devolución total |
| Usuario cancela dentro de ventana permitida | devolución/crédito según método |
| Usuario cancela tarde | retención parcial o sin devolución según política visible |
| Incidencia climática acordada | reprogramación prioritaria |
| No asistencia | reserva completada; registrar incidencia |
| Error de plataforma | restaurar situación y compensar según caso |

Los porcentajes y ventanas no se fijarán hasta obtener evidencia y revisar condiciones legales/comerciales.

## Devoluciones

- una devolución referencia una PaymentOrder/transacción;
- nunca excede lo efectivamente pagado;
- requiere idempotency key;
- conserva motivo y autorizador;
- no se elimina la transacción original;
- estado visible para el usuario;
- plazos dependen del proveedor y deben comunicarse sin promesas falsas.

## Reprogramación

- crea relación entre reserva original y nueva;
- vuelve a validar precio y disponibilidad;
- diferencia de precio se registra explícitamente;
- no sobrescribe historial;
- notifica a partes afectadas.

## Operaciones administrativas

`reservation:override` no equivale a acceso ilimitado:

- solo roles restringidos;
- motivo obligatorio;
- confirmación reforzada para anular cobros o conflictos;
- auditoría y alerta según importe/riesgo;
- nunca puede crear solapamiento silencioso.

## Preguntas para validación

1. ¿Qué ventana de cancelación usan hoy los complejos?
2. ¿Prefieren devolución, crédito o reprogramación?
3. ¿Cuánto tiempo pueden sostener un horario sin adelanto?
4. ¿Quién puede aprobar excepciones?
5. ¿Cómo gestionan lluvia, mantenimiento o cierre?
6. ¿Qué prueba consideran suficiente para registrar un pago?
