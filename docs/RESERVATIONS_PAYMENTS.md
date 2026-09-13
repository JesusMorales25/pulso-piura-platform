# Reservas y pagos de prueba — 7 de septiembre de 2026

Decisiones confirmadas por el usuario:
- Cobros reales deshabilitados. Yape y Plin se simulan; no hay proveedor contratado ni transferencias reales.
- Bloqueo exclusivo al abrir el pago (crear la reserva temporal), por hasta 10 minutos y nunca después del inicio de la franja.
- Adelanto del 25%, redondeado hacia arriba al céntimo, o pago completo. El saldo puede pagarse posteriormente desde Mi actividad.
- El jugador puede cancelar hasta exactamente 2 horas antes del inicio, según el reloj del servidor. Todo pago se retiene; no se generan devoluciones ni créditos.
- El dueño, validado por pertenencia y rol OWNER, puede cancelar sin límite de anticipación únicamente cuando el total pagado es cero. Su endpoint distingue la actuación como dueño incluso cuando también es el cliente.

## Pase QR y cierre de atención

- Al confirmar una reserva, el jugador puede emitir su pase desde `Actividad`.
- Cada emisión usa 32 bytes aleatorios; la base de datos conserva únicamente SHA-256 y rotar el pase invalida el anterior.
- El QR no expone nombres, importes ni identificadores internos: contiene `PULSO-CHECKIN:<token>`.
- Solo el dueño autenticado de la organización asociada puede previsualizarlo y confirmar la llegada.
- La previsualización muestra jugador, complejo, cancha, horario, total pagado y saldo pendiente.
- Confirmar la llegada bloquea la reserva, consume el pase y registra la transición auditada `CONFIRMED → COMPLETED` con correlation ID.
- El check-in es idempotente. Un QR de otro tenant se presenta como inexistente y no revela la organización propietaria.
- El pase vence doce horas después del final reservado. La cámara requiere `localhost` o HTTPS; existe ingreso manual como respaldo.

## Flujo y protección de dinero

1. Catálogo de complejos publicados → cancha → fecha de Lima → franja disponible → abrir pago.
2. POST /api/v1/reservations usa Idempotency-Key, precio del servidor y exclusión GiST de PostgreSQL. Fracciones superpuestas se rechazan; franjas adyacentes se permiten. Un segundo usuario recibe conflicto antes de disponer de una orden pagable.
3. POST /api/v1/payment-orders requiere reservationId, method (YAPE o PLIN), plan (DEPOSIT, FULL o BALANCE), e Idempotency-Key. Solo el cliente puede crear o consultar su orden. Una única orden por cuota INITIAL/BALANCE permite retomar solicitudes interrumpidas.
4. POST /api/v1/payment-orders/{id}/simulate vuelve a tomar el bloqueo de fila de la reserva y valida el estado antes de simular. Confirmación, pago y auditoría se guardan en una transacción. Repetir una confirmación pagada devuelve el mismo resultado sin sumar dinero ni duplicar auditoría.
5. Pago y cancelación toman el mismo bloqueo de reserva, antes de leer importes pagados. Esto serializa operaciones en distintas instancias del backend, no solo en un proceso o navegador.
6. Un bloqueo vencido deja de mostrarse como disponible para pagar. La siguiente reserva que necesita esa franja expira los registros temporales anteriores dentro de su transacción antes de insertar. La orden anterior no puede pagarse una vez vencida o reasignada la reserva.

El modo de despliegue predeterminado es PAYMENTS_MODE=disabled. Para pruebas locales se ha configurado PAYMENTS_MODE=simulation en .env. GET /api/v1/payment-orders/capabilities expone simulationEnabled y realPaymentsEnabled=false. Ningún valor de configuración activa cobros reales en esta implementación.

La integración futura debe implementar un proveedor contratado con confirmación verificable, autenticación de webhooks, idempotencia externa, conciliación y manejo de resultados inciertos. No sustituir la simulación por una transferencia manual o una llamada de cobro dentro de una transacción larga: el proveedor debe respetar la exclusividad y permitir verificar o cancelar un intento antes de liberar su horario. Un comprobante subido por el cliente no constituye confirmación bancaria.

## Módulos

- /canchas: catálogo y disponibilidad asíncrona, exclusividad al entrar al checkout, importe y método de prueba, condiciones, contador y confirmación.
- /actividad: reservas paginadas con nombres de complejo/cancha, retomar pago, completar saldo y cancelar con confirmación y aviso de retención.
- Panel de organización: todas las reservas paginadas, cliente, cancha, horario de Lima, pagado, saldo y cancelación de impagas. Resumen global por organización con confirmadas, pendientes vigentes, canceladas, importes simulados, saldos y retenciones. Refresco periódico con descarte de respuestas obsoletas.
- GET /api/v1/organizations/{organizationId}/reservations/summary requiere OWNER.
- POST /api/v1/organizations/{organizationId}/reservations/{reservationId}/cancel verifica rol, organización de la reserva e importe pagado dentro del bloqueo.

V20 añade cuotas, claves de idempotencia y auditoría de estados de pago. Los importes se guardan en céntimos PEN. Los datos de auditoría no contienen tokens ni credenciales.

## Verificación

- Backend: mvn spotless:check test.
- Frontend: npm run typecheck, npm run lint y npm run build.
- Pruebas de reglas: ReservationCancellationPolicyTest y PaymentOrderServiceTest.
- Pruebas de integración: ReservationPaymentConcurrencyTest (opt-in, requiere PostgreSQL local y una cancha publicada con dueño activo).

Desde PowerShell en la raíz del proyecto, con el motor Docker y los datos locales preparados:

```powershell
. ./scripts/import-local-env.ps1
$env:SPRING_DATASOURCE_URL = $env:DATABASE_URL
$env:SPRING_DATASOURCE_USERNAME = $env:POSTGRES_USER
$env:SPRING_DATASOURCE_PASSWORD = $env:POSTGRES_PASSWORD
mvn -f backend/pom.xml '-DrunDatabaseTests=true' '-Dtest=ReservationPaymentConcurrencyTest' test
```

La suite prueba conflictos superpuestos, franjas adyacentes, doble confirmación simultánea, pago contra cancelación del dueño y vencimiento seguido de reasignación. Crea reservas de prueba con UUID nuevos y elimina solo esos registros al terminar. No ejecutar contra producción. Sin RUN_DATABASE_TESTS=true estas cinco pruebas quedan omitidas de forma explícita.

Limitación de validación de esta sesión: el frontend compila y las pruebas unitarias pasan; la ejecución contra PostgreSQL quedó bloqueada por conexión rechazada en 127.0.0.1:5433 y acceso denegado a docker.exe. No se considera validada aún la ejecución end-to-end ni la migración V20 sobre el entorno local.
