# Pulso Piura — contexto de diseño

## North Star

Experiencia deportiva nocturna, energética y local que permite encontrar un partido o reservar
una cancha desde el celular con precio, cupos y procedencia de los datos siempre visibles.

## Fuentes canónicas

- Identidad, tokens, tipografía y accesibilidad: `docs/product/34_identidad_visual_sistema_diseno.md`.
- Flujos por actor: `docs/product/24_flujos_ux.md`.
- Referencia de Encontrar partido: `docs/design/home-partidos-reference.png`.
- Referencia de Reservar cancha: `docs/design/home-reservas-agenda-reference.png`.
- Decisiones y estado de comparación: `design-qa.md`.

Estas fuentes prevalecen sobre ajustes locales de una pantalla. Un cambio de tokens o de patrón
compartido debe actualizar primero la fuente canónica correspondiente.

## Contrato visual

- Fondo nocturno `#071827`; superficies `#10283B`; acción turquesa `#18C6C8`.
- Lima `#B8E63A` solo comunica disponibilidad o confirmación; no se usa como decoración extensa.
- Escala de 4 px, controles táctiles de al menos 44 px y radios moderados de 8–14 px.
- La fotografía crea energía; el gradiente conserva legibilidad. Los banners automáticos no
  muestran controles cuando son puramente ambientales y respetan movimiento reducido.
- Inicio separa las tareas: Encontrar partido presenta partidos y Reservar cancha concentra el
  catálogo, filtros, disponibilidad y checkout de complejos. `Explorar` lleva a ese inicio y no
  duplica el catálogo en una ruta distinta.

## Contrato responsive

- Viewport principal: 393 × 852 CSS px; soporte compacto desde 320 px sin texto truncado ni CTA
  fuera de pantalla.
- Cabecera simétrica: marca, ubicación centrada y acceso de sesión.
- La navegación inferior móvil mantiene cinco destinos estables: Explorar, Actividad, Crear,
  Tercer tiempo y Perfil. Las consolas de plataforma y complejos se ofrecen dentro del contexto de
  la cuenta y siguen dependiendo de capacidades.
- La interfaz nunca sustituye la autorización del backend.

## Contenido y estados

- Todo contenido no conectado a la API se rotula como demostración.
- Carga, vacío y error conservan la geometría y explican la siguiente acción.
- Los CTA usan verbos directos y consistentes: `Unirme`, `Reservar`, `Ver detalles`.
- Yape y Plin conservan color propio únicamente al identificar el método de pago.

## Estabilidad entre modos

Inicio comparte geometría de banner, saludo, título y selector entre partidos y reservas.
Los filtros de deportes y días usan dimensiones comunes definidas en app/styles.css,
según el contrato de identidad visual. La selección respeta movimiento reducido.

## Resúmenes y detalle bajo demanda

- Los paneles de jugador, organizador, propietario y administración presentan primero cantidades por categoría en tarjetas que funcionan como botones.
- La tarjeta abre un FormSheet con la lista de esa categoría; seleccionar un registro abre su gestión dentro del mismo popup, con regreso a la lista. No se apilan fichas completas, comprobantes, QR ni formularios en la página inicial.
- El popup conserva el estilo nocturno, foco visible y controles táctiles de 44 px; cierra con Escape y devuelve el foco. Cerrar un visor de comprobante anidado conserva abierto el detalle de origen.
- Los contadores usan todos los registros autorizados, no solo la página visible. Carga/error no se presentan como cero; las decisiones actualizan resumen y listas. Las categorías financieras pueden superponerse con los estados de reserva.

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

## Fotografías y publicación

Las fotos reales pertenecen a cada cancha, con galería bajo demanda en FormSheet, hasta ocho imágenes y una portada. Se recomienda tres, pero se permite publicar y completarlas después. Portada y galería sustituyen la referencia generada sin atribuir imágenes ficticias a un negocio. Administración configura cinco portadas globales (Explorar partidos/canchas, actividad, crear y complejos) desde una pantalla específica; las variables de entorno configuran almacenamiento, no contenido editorial.

## Tarjetas de reserva — referencia del 24 de octubre

El catálogo comparte VenueBookingCard: ficha fotográfica con nombre, ubicación, servicios reales, calificación declarada y tarifa mínima; segundo bloque con cuatro turnos, selección y acciones de adelanto/completo. Otros horarios abre el diálogo existente. En móvil estrecho los turnos pasan a dos columnas y las acciones se apilan desde 360 px. La franja de siete días desplaza dentro de su contenedor. No se inventan reseñas ni se modifica la confirmación manual de pagos.

Ajuste solicitado: filtros de fecha/deporte/distrito, distrito a ancho completo; tarifa sin «Desde» y valoración en una fila compartida. Los servicios siguen siendo información de la cancha, sin filtros de techada/LED.

## Consola de plataforma y turnos bajo demanda

Plataforma conserva métricas reales, accesos y popups autorizados, con cabecera ilustrada mediante iconos, resumen en tarjetas y herramientas visibles. No se añade filtro temporal ficticio. Reserva tu cancha presenta cinco fechas sin desplazamiento horizontal; cada ficha abre sus turnos en FormSheet desde un botón de ancho completo. Selección, adelanto, pago completo y otros horarios mantienen el flujo existente y cierran la ficha antes de continuar.

## Resumen del jugador — Mis inscripciones

La variante player de SummaryCards presenta seis categorías con icono, etiqueta, cantidad y acceso a detalle. Dos columnas en móvil, tres en escritorio; turquesa para acciones y pagos, lima para confirmados y tonos neutros para espera/historial. Se conserva el banner fotográfico de actividad y los popups existentes; no cambian las categorías ni el cálculo financiero.

## Mis reservas — resumen del jugador

El panel reutiliza las tarjetas player de Mis inscripciones: icono, cantidad y acceso a detalle en dos columnas móviles. La cabecera ofrece Buscar canchas. Saldo pendiente presenta cantidad de reservas e importe secundario; las categorías, paginación y popups conservan datos y funcionamiento. Confirmadas usa lima; pagos y navegación turquesa; finalizadas tono neutro.
