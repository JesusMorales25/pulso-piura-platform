# 33. Evaluación y selección del proveedor de pagos

## Decisión pendiente

Elegir un proveedor comercial para automatizar el cobro sin acoplar el producto a una marca. Se decidirá después de recibir propuestas y probar el sandbox: una mención comercial no garantiza que la función esté habilitada para nuestro contrato.

## Evidencia pública verificada

- Yape indica que un comercio puede incorporar pago en línea mediante Culqi, Niubiz o Izipay.
- Yape ofrece cobro por QR y pago en línea; el flujo y los límites dependen del producto contratado.
- Plin publica cobros interoperables por QR para negocios.
- BBVA ofrece QR empresarial y archivos diarios de conciliación; esto prueba una ruta operativa, pero no una API pública equivalente para comercio electrónico.

La arquitectura soportará `YAPE`, `PLIN` e `INTEROPERABLE_QR`; el método visible dependerá de capacidades verificadas por contrato y pruebas end-to-end.

## Criterios eliminatorios

Descartar un proveedor si no ofrece:

- confirmación servidor a servidor autenticable o consulta oficial;
- identificador único por transacción;
- sandbox y documentación técnica;
- conciliación descargable o por API;
- soporte empresarial en Perú;
- términos compatibles con un SaaS multicomplejo;
- seguridad, datos y responsabilidades contractuales aceptables.

## Matriz ponderada

| Criterio | Peso | Evidencia |
|---|---:|---|
| Yape en línea | 15 | demo y transacción sandbox |
| Plin o QR interoperable | 15 | método y confirmación demostrables |
| Webhooks/consulta e idempotencia | 15 | documentación y pruebas negativas |
| Conciliación y devoluciones | 12 | archivo/API, parcial y total |
| Costos totales | 12 | comisión, IGV, alta, mínimo, devolución |
| Liquidación a complejos | 8 | plazos, cuentas y modelo marketplace |
| Seguridad y cumplimiento | 8 | firma, PCI aplicable, incidentes, DPA |
| SLA y soporte | 5 | disponibilidad y escalamiento |
| Calidad del SDK/API | 5 | versiones, errores y documentación |
| Portabilidad | 5 | exportación y riesgo de dependencia |

Puntuar cada criterio de 0 a 5. Mínimo sugerido: 75/100 y ningún criterio eliminatorio incumplido.

## Preguntas al proveedor

1. ¿Yape y Plin son métodos separados o se aceptan mediante QR interoperable?
2. ¿Funciona en web móvil/PWA sin POS físico?
3. ¿Cómo se firma un webhook y consulta el estado final?
4. ¿Cómo resuelven duplicados y eventos fuera de orden?
5. ¿Aceptan idempotency key del comercio?
6. ¿Cómo expiran órdenes y QR?
7. ¿Hay devoluciones parciales y totales?
8. ¿Cómo concilian comisión, impuesto, neto y liquidación?
9. ¿Cada complejo puede recibir directamente o cobra la plataforma?
10. ¿Se requieren subcomercios o split payments?
11. ¿Qué documentos, plazos y límites aplican?
12. ¿Qué cambia entre sandbox y producción?
13. ¿Cómo se versiona y notifica una ruptura de API?

## Prueba técnica mínima

- éxito, rechazo, abandono y expiración;
- webhook válido, inválido, duplicado y fuera de orden;
- retorno del navegador antes/después del webhook;
- timeout con consulta posterior;
- intento de alterar importe desde frontend;
- devolución parcial y total;
- conciliación con diferencia intencional;
- aislamiento de dos complejos;
- caída temporal y recuperación.

## Estrategia recomendada

1. Validar operación manual con 1–3 complejos.
2. Solicitar cotización y documentación a Culqi, Niubiz e Izipay.
3. Evaluar la matriz y ejecutar un spike con los dos mejores.
4. Seleccionar uno mediante ADR y feature flag.
5. Mantener el adapter manual solo como contingencia auditada.
6. Evaluar un segundo proveedor cuando volumen o continuidad lo justifiquen.

El resultado del spike será un informe reproducible con versión de API, flujo, pruebas, costos, riesgos, decisión y salida. No se usarán credenciales personales ni cuentas informales para producción.
