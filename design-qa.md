# Design QA — tarjeta de partido destacado y detalle

## Evidencia

- Fuente visual principal: `D:\pulso-piura-proyecto\pulso-piura-platform\docs\qa\featured-match-reference.png`.
- Fuentes complementarias: capturas del usuario con equipo confirmado, precio y acciones.
- Captura de implementación: `D:\pulso-piura-proyecto\pulso-piura-platform\docs\qa\featured-match-mobile.png`.
- Ruta revisada: `http://localhost:3000/?mode=matches`.
- Viewports interactivos: 393 × 852 px y 320 × 700 px.
- Captura persistida: 500 × 1100 px, escala 1. Chrome headless aplica 500 px como ancho mínimo efectivo.
- Estado: partido público con un jugador inscrito, nueve vacantes y cuota de S/ 15.

## Comparación de vista completa

- La tarjeta mantiene el fondo azul oscuro, borde cian, imagen deportiva nocturna y jerarquía tipográfica de la referencia.
- Fecha, hora y vacantes aparecen en una franja de tres columnas legible.
- La navegación inferior se mantiene visible y la tarjeta no la invade.
- En 393 px y 320 px no se observó desbordamiento del componente ni pérdida de controles.

## Comparación de regiones

| Superficie | Resultado |
|---|---|
| Tipografía | Título dominante, rótulos compactos en mayúsculas y cifras con peso alto. No hay cortes del título ni de los datos principales. |
| Espaciado | El contenido conserva un ritmo compacto; imagen, métricas, organizador, equipo y acciones forman grupos claramente separados. |
| Color | Se conservaron azul noche, cian para información y verde lima para cupos, precio y acción principal. El contraste es suficiente. |
| Imagen | Se reutiliza el activo deportivo nocturno del producto con recorte focal hacia los jugadores. |
| Equipo confirmado | Incluye ocupación real, barra de progreso, avatares públicos, contador y cupos disponibles. |
| Precio y acciones | Precio, copia del enlace y botón para unirse comparten una misma franja. El botón de copia cambia a estado confirmado. |
| Detalle | El banner se redujo de 350 a 320 px en escritorio y de 270 a 238 px en móvil; el cierre pasó de 42 a 36 px. |

## Interacciones verificadas

- Carga del partido real desde la API.
- Acceso al detalle mediante “Unirme” o el estado de inscripción.
- Copia del enlace mediante teclado y cambio visible a “Enlace copiado”.
- Render responsive a 393 × 852 px y 320 × 700 px.
- Consola revisada; la advertencia LCP se corrigió cargando la imagen destacada con prioridad. La extensión del navegador añadía un atributo al `body`; el layout tolera esa modificación sin mostrar un falso error de hidratación.

## Historial de ajustes

1. La tarjeta anterior usaba una columna lateral de fecha y no agrupaba las acciones como la nueva referencia.
2. Se reemplazó por una cabecera fotográfica, métricas horizontales, organizador, equipo confirmado y pie de conversión.
3. La primera revisión detectó carga no prioritaria de la imagen principal; se añadió `priority`.
4. La revisión posterior no mostró problemas P0, P1 o P2.

## Hallazgos

No quedan diferencias P0, P1 o P2. La implementación incorpora contenido funcional adicional solicitado sin romper la jerarquía visual de la referencia.

final result: passed
