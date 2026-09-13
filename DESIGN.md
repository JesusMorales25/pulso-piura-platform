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
  catálogo, filtros, disponibilidad y checkout de complejos. No existe una navegación separada
  para Explorar.

## Contrato responsive

- Viewport principal: 393 × 852 CSS px; soporte compacto desde 320 px sin texto truncado ni CTA
  fuera de pantalla.
- Cabecera simétrica: marca, ubicación centrada y acceso de sesión. Perfil vive únicamente en la
  cabecera cuando existe una sesión.
- Navegación y opciones se derivan de capacidades; la interfaz nunca sustituye la autorización del
  backend.

## Contenido y estados

- Todo contenido no conectado a la API se rotula como demostración.
- Carga, vacío y error conservan la geometría y explican la siguiente acción.
- Los CTA usan verbos directos y consistentes: `Unirme`, `Reservar`, `Ver detalles`.
- Yape y Plin conservan color propio únicamente al identificar el método de pago.

## Estabilidad entre modos

Inicio comparte geometría de banner, saludo, título y selector entre partidos y reservas.
Los filtros de deportes y días usan dimensiones comunes definidas en app/styles.css,
según el contrato de identidad visual. La selección respeta movimiento reducido.
