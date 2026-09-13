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
