# ADR-007 — Pagos externos con comprobantes privados

Estado: aceptada por el usuario en la conversación del 22 de octubre de 2026.

Se incorpora `external_manual` como alternativa configurable a `simulation` y `disabled`.
No se contrata pasarela ni se almacenan credenciales bancarias. El dinero se transfiere
directamente al organizador de un partido o al complejo de una reserva.

Una captura solo inicia una revisión. La confirmación procede de un receptor autorizado que
declara haber verificado sus movimientos bancarios; no equivale a confirmación de Yape/Plin.
Los importes provienen del servidor. Se mantiene idempotencia, auditoría y exclusión de horarios.
Una revisión tardía nunca recupera un horario o cupo liberado; requiere resolución operativa.

Por aprobación explícita del usuario, el primer adaptador utiliza un volumen de archivos privado
persistente del VPS. PostgreSQL conserva metadatos e historial, no imágenes. Se define el puerto
PaymentProofStorage para permitir un adaptador privado compatible con S3 sin cambiar el dominio.
No se ha implementado S3 en esta entrega. Los adjuntos no se sirven como archivos estáticos.

Este piloto amplía DEC-015 y concreta la conciliación operativa de ADR-005. Reemplaza únicamente
la prohibición temporal de registrar pagos externos del modo demostración; los registros de
simulación siguen separados e identificados. No se habilita ninguna pasarela automática.

Consecuencias: el receptor debe atender revisiones; se necesitan volumen, backups externos y
política de conservación. No habilitar external_manual en Render gratuito con disco efímero.
