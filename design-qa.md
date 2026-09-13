# Design QA — Partidos abiertos

## Fuente visual

- Captura de referencia compartida por el usuario: tarjeta principal de partido destacado y tarjeta compacta del siguiente partido.
- Implementación revisada: `http://localhost:3000/?mode=matches`.
- Viewport móvil revisado: 390 × 844 px.

## Comparación visual

| Elemento | Resultado |
|---|---|
| Jerarquía de fecha, hora y título | Coincide con la composición de la referencia mediante una columna lateral de fecha y un título dominante. |
| Datos operativos | Precio, cupos, ocupación, organizador, pago y ubicación aparecen agrupados y legibles. |
| Acciones | La acción principal para unirse y el acceso a detalles conservan el orden y contraste de la referencia. |
| Segundo partido | Se muestra debajo como tarjeta compacta con fecha, deporte, ubicación, cupos y precio. |
| Responsive | No existe desbordamiento horizontal a 390 px; la grilla de métricas se apila y los controles mantienen un área táctil suficiente. |
| Estado de inscripción | Una participación existente reemplaza el botón de alta por el estado confirmado o de lista de espera. |

## Validación funcional visible

- La pantalla principal muestra como máximo los dos partidos próximos devueltos por fecha.
- Existe un único enlace “Ver todos los partidos”.
- Los botones y enlaces están expuestos con nombres accesibles.
- La fotografía cambia entre fútbol y vóley según el deporte; la tarjeta compacta usa el icono correspondiente.

## Diferencia aceptada

- Los avatares de ocupación se representan con iconos porque el contrato público actual no entrega fotografías de participantes. Esto evita exponer datos personales y mantiene la lectura de cupos.
