# Recursos visuales de la demostración

Actualizado: 2026-10-09.

No se encontró acreditación de origen o derechos de los doce archivos raster que se servían desde
`frontend/public/images`. Se retiraron de la carpeta pública y de las referencias del frontend. Se
conservan localmente, sin servir ni indexar, en `.verification/quarantined-assets` hasta que el
responsable aporte evidencia. No restaurarlos en el despliegue sin comprobarla.

| Recursos retirados | Sustitución |
|---|---|
| hero-football-night, hero-match-football-mixed-night, hero-venue-padel-night, venue-football-7 | court-reference.svg |
| hero-match-volleyball-night, venue-volleyball | volleyball-reference.svg |
| third-time-choperia, third-time-restaurant, third-time-sports-bar | third-time-reference.svg |
| player-carlos-demo, match-participants-demo | avatar-reference.svg |
| explore-piura-map | map-reference.svg |

Los cinco SVG son ilustraciones geométricas originales escritas para este proyecto el 9 de octubre
de 2026: no copian fotografías, marcas, personas ni instalaciones. Son recursos referenciales del
producto, no fotografías del complejo ni prueba de su ubicación. No incluyen scripts, vínculos ni
recursos externos. Su uso en el aplicativo está autorizado por la solicitud de implementación.

Manrope Variable se sirve localmente mediante `@fontsource-variable/manrope`. La licencia incluida
en el paquete es **SIL Open Font License 1.1**, Copyright 2019 The Manrope Project Authors. Phosphor
Icons React incluye **MIT License**, Copyright 2020 Phosphor Icons. Conservar las licencias de ambos
paquetes en distribuciones; revisar sus archivos LICENSE al actualizar versiones.

Las fotos federadas y las imágenes HTTPS o subidas por administradores son contenido de terceros.
No se acredita automáticamente su copyright. La interfaz recuerda que solo deben publicarse fotos
propias o autorizadas; los términos de demo lo explican. El operador debe conservar acreditación,
atender solicitudes de retiro y evitar fotografías de personas sin autorización. La sustitución
de assets versionados no modifica imágenes ya almacenadas en una base de datos desplegada.
