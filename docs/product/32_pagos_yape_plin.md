# 32. Pagos de reservas con Yape y Plin

## Objetivo y alcance

Permitir el pago total o adelanto de una reserva mediante Yape y Plin, con confirmación confiable, trazabilidad, conciliación y capacidad de cambiar de proveedor sin reescribir el dominio.

- **Yape en línea:** integrar mediante una pasarela/adquirente habilitado y contratado.
- **Plin:** aceptar mediante QR interoperable o servicio comercial del adquirente; automatizar solo si entrega API y confirmación servidor a servidor documentadas.
- **Piloto:** permitir registro manual conciliado para pocos complejos mientras se valida conversión, costos y operación.
- **Producción:** no confirmar con capturas ni leyendo notificaciones de un celular.

La plataforma no almacenará credenciales bancarias ni datos completos de tarjeta, ni mantendrá saldo del usuario en el MVP.

## Experiencia del usuario

1. El usuario elige horario y ve precio, adelanto, cancelación y tiempo del `HOLD`.
2. Selecciona un método realmente disponible.
3. El backend crea `PaymentOrder` e inicia `PaymentAttempt`.
4. La interfaz muestra la acción del proveedor: aprobación en app, checkout o QR transaccional.
5. La pantalla queda en **Verificando pago**; el retorno del navegador no prueba el pago.
6. Tras confirmación confiable, el backend marca la orden pagada y confirma la reserva.
7. Si vence o falla, se informa y libera el horario conforme a las reglas.

En el piloto manual se mostrará **Pago enviado, pendiente de validación**, nunca **Reserva confirmada**, hasta conciliar.

## Arquitectura

```text
Next.js/PWA
    │ crea orden / inicia intento / consulta estado
    ▼
Spring Boot: payments
    ├── PaymentApplicationService
    ├── PaymentProviderPort
    ├── WebhookVerifier
    ├── ReconciliationService
    └── RefundService
             │
             ├── AdapterYapeGateway
             ├── AdapterInteroperableQr
             └── AdapterManualPilot
```

`payments` es dueño del estado financiero. `reservations` reacciona a `PaymentConfirmed` mediante eventos internos/outbox. Ningún controlador del proveedor modifica directamente una reserva.

## Modelo funcional

`PaymentOrder` contiene organización, pagador, propósito, importe en céntimos, moneda PEN, adelanto requerido, estado, vencimiento, importe pagado y versión.

`PaymentAttempt` contiene proveedor, método (`YAPE`, `PLIN`, `INTEROPERABLE_QR`, `MANUAL_TRANSFER`), referencia única del proveedor, estado normalizado, token opaco de checkout y fechas. No guarda secretos reutilizables.

```text
CREATED → REQUIRES_ACTION → PROCESSING → SUCCEEDED
   └───────────────→ FAILED | EXPIRED | CANCELLED
SUCCEEDED → REFUND_PENDING → PARTIALLY_REFUNDED | REFUNDED | REFUND_FAILED
```

La orden se considera pagada cuando el importe neto confirmado alcanza el adelanto requerido.

## Reglas obligatorias

1. El backend calcula moneda, importe y concepto.
2. Creación y reintentos usan `Idempotency-Key`.
3. `provider_transaction_id` tiene restricción única.
4. Webhooks se autentican, limitan y procesan idempotentemente.
5. El retorno del checkout solo cambia la UI a verificación.
6. Eventos fuera de orden se resuelven con máquina de estados y consulta al proveedor.
7. Un pago tardío después de expirar el `HOLD` pasa a revisión, reubicación o devolución; nunca fuerza un solapamiento.
8. Toda conciliación manual registra operador, fecha, referencia, motivo y evidencia.
9. Ninguna devolución excede el neto cobrado ni elimina el movimiento original.

## Seguridad y fraude

- secretos en secret manager y separados por ambiente;
- TLS, firma de webhook y allowlist si está disponible;
- autorización contextual por organización;
- step-up o doble confirmación para devoluciones y ajustes de riesgo;
- rate limiting en intentos y webhooks;
- logs sin tokens, QR reutilizables, teléfonos completos ni payloads sensibles;
- alertas por referencias reutilizadas, importes discordantes y exceso de conciliación manual;
- auditoría de cambios de estado y decisiones administrativas.

## Conciliación y devoluciones

Habrá conciliación en línea (webhook/consulta), programada (reporte/API) y por excepción manual. Sus estados serán `MATCHED`, `MISSING_INTERNAL`, `MISSING_PROVIDER`, `AMOUNT_MISMATCH`, `DUPLICATE`, `UNDER_REVIEW` y `RESOLVED`.

Las devoluciones usarán la API del proveedor cuando exista. En caso contrario se creará una tarea manual controlada y solo se marcará `REFUNDED` tras comprobar su ejecución. Se conservarán comisión, importe neto, motivo y autorizador.

## Fases

### Piloto

- Yape/Plin por QR o número comercial del complejo;
- orden y referencia interna obligatorias;
- evidencia opcional, estado pendiente y conciliación por operador;
- tablero de pendientes, vencidos y diferencias;
- métricas de conversión, demora y carga operativa.

### MVP automatizado

- un proveedor contratado;
- Yape en línea y QR interoperable/Plin según capacidad contractual;
- webhook, consulta, conciliación diaria y devolución;
- feature flags por organización y ambiente.

### Evolución

- segundo proveedor para continuidad;
- pagos divididos entre jugadores;
- inscripción a torneos;
- payout/split solo después de análisis legal, tributario y de riesgo.

## Criterios de aceptación

- no existe doble cobro ante reintentos;
- reserva se confirma una sola vez;
- webhook falso o alterado se rechaza;
- pago se refleja aunque el usuario cierre el navegador;
- pago tardío no causa solapamiento;
- operador solo ve su organización;
- conciliación detecta importes diferentes y duplicados;
- devolución conserva trazabilidad;
- caída del proveedor no pierde la orden sin transición definida.

## Métricas y preguntas de validación

Medir conversión por método, tiempo p50/p95, abandono, error, conciliación automática, discrepancias, devoluciones y horas operativas por 100 cobros.

Preguntar a los complejos: distribución actual entre Yape/Plin/efectivo, cuenta receptora, responsable de conciliación, adelanto, comprobantes dudosos, aceptación de comisiones, emisión tributaria y preferencia entre devolución, crédito o reprogramación.

Antes del adapter definitivo se requiere contrato, sandbox, documentación, firma, estados, SLA, comisiones, liquidación, devoluciones, conciliación y responsabilidades tributarias.
