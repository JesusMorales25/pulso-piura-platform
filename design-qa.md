# QA visual — reservas de cancha

Fecha: 2026-09-28
Referencia: `.verification/reference-reservation-card.png`

## Resultado

La implementación conserva la jerarquía clave de la referencia: identidad del complejo, ubicación, atributos, tarifa destacada, calificación, cinco turnos disponibles, selección visible y bloque final de acciones. En móvil se reorganiza en una sola columna y mantiene los turnos en una franja desplazable para no comprimir su lectura.

| Ancho | Desbordamiento horizontal del documento | Turno seleccionado | Acciones de pago | Diálogo |
|---|---:|---|---|---|
| 320 px | No (`310 / 310`) | Visible, `aria-pressed=true` y “Elegido” | 20 % y completo, 44 px de alto | Abre y cierra con Escape |
| 393 px | No (`383 / 383`) | Visible, `aria-pressed=true` y “Elegido” | 20 % y completo, 44 px de alto | Abre y cierra con botón/Escape |
| 768 px | No (`758 / 758`) | Visible en la franja de cinco turnos | Acciones alineadas en el resumen | Detalle completo, sin datos privados |

## Hallazgos y correcciones

- P0: ninguno.
- P1: ninguno.
- P2 resuelto: se priorizaron los chips de iluminación LED y estacionamiento para que no desaparezcan en pantallas estrechas.
- P2 resuelto: los botones de reserva se elevaron a un mínimo táctil de 44 px y se añadió foco visible.
- P2 resuelto: los nombres de cancha y los turnos disponibles se mantienen legibles sin scroll horizontal del documento.
- P3: la navegación inferior fija puede superponerse visualmente en una captura de página completa; durante el uso normal permanece fija y el contenido conserva espacio de desplazamiento inferior.

## Accesibilidad y estado

- Los horarios son botones reales con `aria-pressed`.
- La calificación configurada declara `Calificación informada por el complejo`; si falta, muestra `Sin calificación`.
- El diálogo usa `role="dialog"`, `aria-modal`, título asociado, cierre explícito y cierre con Escape.
- La consola no presentó errores de ejecución durante el flujo validado.
- La vista pública contiene exclusivamente turnos disponibles; no expone estados ni datos del titular de reservas existentes.

final result: passed
