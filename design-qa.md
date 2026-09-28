# QA visual — observaciones de interfaz móvil

Fecha: 2026-09-28

Fuente: `C:/Users/jesus.morales.s/Downloads/Observaciones interfaz móvil para Codex.docx`

Implementación: `http://localhost:3000/partidos/partido-f0c2fe0689c04ffda5d1499fd58e0295`, `http://localhost:3000/?mode=matches`, `http://localhost:3000/?mode=venues` y `/reservas-cancha`.

## Estados comparados

| Vista | Estado validado | 393 px | 320 px |
|---|---|---:|---:|
| Detalle de partido | Acción fija y panel de confirmación con Yape/Plin y política | Sin desbordamiento | Sin desbordamiento |
| Partido destacado | Etiqueta “Próximo por horario” | Legible | Legible, en dos líneas |
| Horarios del complejo | Diálogo oscuro, atributos traducidos y turnos completos | 2 columnas | 1 columna |
| Reservas del propietario | Métricas, ficha, importes y acciones apilados | Reglas responsivas verificadas | Reglas responsivas verificadas |

La revisión visual se hizo en el navegador integrado con densidad CSS 1. Las tres vistas públicas se compararon en los mismos estados que muestran las referencias. El tablero del propietario se verificó por estructura y estilos porque la sesión local de Auth0 no estaba autenticada; no se introdujeron credenciales para forzar la prueba.

## Hallazgos

- P0: ninguno.
- P1: ninguno.
- P2 resuelto: la acción fija de reserva ya no obliga a volver al contenido para seleccionar el medio de pago o aceptar la política.
- P2 resuelto: la etiqueta temporal del partido se ajusta al ancho disponible sin invadir otras columnas.
- P2 resuelto: el diálogo de horarios usa la paleta del producto, conserva precios y rangos completos y evita códigos técnicos con guiones bajos.
- P2 resuelto: el panel del propietario pasa a una sola columna, mantiene métricas en dos columnas y expande las acciones al ancho disponible.
- P3 conocido: la ruta privada solo muestra el estado de inicio de sesión en una sesión anónima; la validación visual con datos reales requiere una sesión Auth0 de propietario.

## Evidencia funcional

- El panel móvil abre y cierra con Escape, comparte la selección con el formulario y solo habilita la confirmación al elegir Yape/Plin y aceptar la política.
- No hubo desbordamiento horizontal del documento a 320 ni 393 px.
- Los turnos visibles son únicamente los disponibles y conservan hora y precio completos.
- Pruebas: 26/26; typecheck, lint y build de producción correctos.

final result: passed
