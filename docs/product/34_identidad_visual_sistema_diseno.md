# 34. Identidad visual y sistema de diseño

## Dirección seleccionada

Una experiencia deportiva nocturna, energética y local, equilibrada con la claridad y confianza necesarias para reservas y pagos. La marca de trabajo es **Pulso Piura**; su adopción comercial permanece sujeta a búsqueda registral y decisión de marca.

## Principios

1. **Energía con control:** el deporte aporta movimiento; la interfaz conserva orden.
2. **Confianza visible:** precio, cupos, organizador y estado del pago nunca se ocultan.
3. **Móvil y legible:** el contenido principal funciona a 393 × 852 CSS px.
4. **Color semántico:** un color tiene una función consistente.
5. **Local sin clichés:** Piura se expresa mediante personas, escenarios y lenguaje reales.
6. **Accesible:** contraste WCAG AA, foco visible, blancos táctiles mínimos y estados con texto/icono.

## Paleta oficial del prototipo

| Token | Hex | Uso | Proporción orientativa |
|---|---|---|---:|
| `color.bg.primary` | `#071827` | fondo principal, confianza y deporte nocturno | 55–60% |
| `color.surface` | `#10283B` | grupos, navegación y superficies elevadas | 20–25% |
| `color.action.primary` | `#18C6C8` | CTA, enlaces, foco y selección | 8–10% |
| `color.signal.urgent` | `#FF6B2C` | urgencia, valoración o alerta moderada | ≤5% |
| `color.status.available` | `#B8E63A` | cupos disponibles y éxito | ≤3% |
| `color.text.primary` | `#F5F8FA` | texto principal | según contenido |
| `color.text.muted` | `#9FB1BF` | texto secundario | según contenido |

Yape y Plin conservan sus colores solo dentro de su identificación de método. Naranja y lima nunca se usan como grandes fondos decorativos.

## Tipografía

- UI y lectura: Roboto o equivalente neutral, 14–16 px de base.
- Titulares deportivos: familia condensada futura, limitada a títulos breves.
- Máximo dos familias y cinco pesos.
- Mayúsculas solo para etiquetas cortas; no para párrafos ni acciones extensas.

## Escala y forma

- espaciado base: 4 px; escala: 4, 8, 12, 16, 24, 32;
- radios: 8 px controles, 12–14 px superficies, circular para avatares;
- blanco táctil mínimo: 44 × 44 px;
- bordes: gris azulado con baja opacidad;
- sombras: excepcionales; la jerarquía depende de espacio, tipo y contraste.

## Componentes base

- encabezado con marca, ubicación y perfil;
- buscador con filtros;
- resumen unificado de partido;
- bloque editorial fecha/hora;
- progreso de ocupación y avatares;
- confianza del organizador;
- CTA primario y acción secundaria;
- selector de método de pago;
- barra de navegación inferior;
- estados de verificación y confirmación;
- encabezado interior con regreso.

## Reglas semánticas

- turquesa = interacción activa;
- lima = disponible/confirmado;
- naranja = atención o urgencia;
- morado Yape/cian Plin = identificación del método, no estado;
- error futuro = rojo diferenciado y acompañado de texto/icono;
- una reserva pendiente nunca usa el mismo tratamiento que una confirmada.

## Imágenes

- personas reales o realistas practicando deporte local;
- movimiento natural y diversidad;
- fondos con espacio para texto y overlay controlado;
- sin logos inventados, marcas de terceros ni estereotipos turísticos;
- avatares con consentimiento o datos simulados.

## Accesibilidad y validación

- comprobar contraste en tokens y combinaciones reales;
- texto ampliable sin ocultar acciones;
- foco visible y orden lógico;
- no comunicar cupos, pago o error solo con color;
- probar iPhone y Android incluidos en el prototipo;
- incluir estados de carga, vacío, error, vencimiento y conectividad limitada en diseño posterior.


## Ajuste de estabilidad de Inicio — 2026-09-06

La solicitud actual unifica la geometría de ambos modos. El propietario es el bloque
Shared home geometry de frontend/app/styles.css, con HomeDashboard como composición.
Los títulos se superponen en una celda de cuadrícula que reserva ambas medidas; solo
el título activo es accesible. Los filtros comparten los tokens --home-filter-width y
--home-filter-height: 104 × 44 px en móvil y 112 × 46 px en escritorio.
La selección modifica color y borde sin alterar peso, dimensiones ni posición.

## Tarjeta móvil de reserva — 2026-09-28

La tarjeta de cancha adopta una superficie nocturna compacta con identidad, ubicación, atributos,
precio inicial, calificación administrada y hasta cinco turnos disponibles. El turno elegido usa
lima, borde de alto contraste, `aria-pressed=true` y el texto `Elegido`; el color no es la única
señal. El resumen ofrece `Reservar con 20 %`, `Pagar completo` y `Otros horarios` sin anidar
controles interactivos.

En pantallas estrechas se priorizan techado, iluminación LED y estacionamiento. Los turnos pueden
desplazarse dentro de su propia franja, sin provocar scroll horizontal del documento. Los botones de
pago tienen al menos 44 px de alto y todos los controles de tarjeta y diálogo exhiben foco visible.
La composición fue comprobada en 320, 393 y 768 px.

## Adaptación móvil compartida — 24 de octubre de 2026

La referencia sigue siendo Inicio: identidad nocturna, tarjetas legibles y separación consistente. La corrección mantiene rutas, contenido, permisos y acciones.

- Contenedores de operación con un margen lateral mínimo de 16 px y safe areas; ningún formulario de ancho completo añade márgenes externos al ancho de su padre.
- Popups con 16 px de separación exterior, 20 px interiores (16 px en 320 px), cabecera visible al desplazar y cierre de 44 px. La altura disponible usa dvh y conserva distancia con la navegación inferior.
- Formularios de dos columnas pasan a una en teléfonos estrechos. Nombres, correos y direcciones largos se ajustan sin perder contenido. Controles cómodos, texto de entrada de 16 px para evitar zoom automático.
- Los errores de ancho se corrigen en su contenedor; no se ocultan con overflow-x:hidden en la página. Carruseles y tablas conservan desplazamiento interno cuando corresponde.
- Comprobación con datos sintéticos largos en 320/393/768 y escritorio, más altura reducida para verificar desplazamiento de popups. La emulación no sustituye una validación física en iPhone/Android.

## Escritorio y tableta — espacio de trabajo deportivo

Se conserva el diseño móvil y la misma identidad Manrope/nocturno/turquesa/lima. La adaptación de escritorio se activa desde 1024 px; entre 900 y 1023 px la navegación es horizontal superior y bajo 900 px sigue siendo inferior.

- Navegación lateral persistente de 224–240 px, accesos por los mismos permisos y página actual marcada; cabecera con ubicación y perfil.
- Contenido calculado respecto al espacio disponible (sin vw que invada el menú), máximo 1280 px, con margen de 32–48 px. Cabeceras fotográficas de cancha y jerarquía deportiva, sin cambiar datos ni añadir indicadores ficticios.
- Resúmenes fluidos y formularios agrupados. Perfil en dos zonas, catálogos y espacios en columnas cuando el contenido lo permite.
- Los diálogos de gestión se centran y amplían. Desde 1280 px, reservas de jugador y propietario permiten lista y detalle simultáneos; en móvil permanece lista → detalle. Un solo formulario de pago por reserva seleccionada.

Plan de implementación: (1) navegación y geometría compartida; (2) espacios de trabajo y formulario de escritorio; (3) pruebas de los cuatro roles en móvil/tableta/escritorio, revisión visual y compilación. Reutilizar lógica/API actuales; no duplicar autorización ni datos para cada dispositivo.
