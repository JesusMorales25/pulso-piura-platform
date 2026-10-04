# Levantamiento de observaciones — octubre 2026

Fuente: Mejoras_Pulso_Piura_para_Codex.pdf, cinco páginas. Se conserva el diseño y los permisos existentes.

| Observación | Implementación |
|---|---|
| 1. Complejos duplicados | Validación por nombre, distrito y dirección normalizados. La migración V33 protege también las sedes concurrentes. Igual nombre con otra ubicación permitido; registros antiguos conservados. |
| 2. Acceso a creación | Botón Crear complejo en Mis canchas y acceso directo desde el perfil, reutilizando el formulario existente. |
| 3. Resumen del dueño | Complejos, canchas publicadas, partidos de hoy y estimación de reservas confirmadas/completadas según zona horaria. No se presenta estimación como efectivo cobrado. |
| 4. Tarjetas de complejos | Nombre, ubicación, rol, estado, conteos y acceso al panel correcto. Ubicaciones antiguas se obtienen de las sedes. Sin fotografías ni sellos de verificación inventados. |
| 5. Responsables | Nombres, correos, roles y dueño principal (creador aún propietario). Asignación OWNER/ADMIN auditada y protección del último dueño. |
| 6. Filtros de usuarios | Todos, jugadores, organizadores y dueños; conteos, búsqueda por nombre/correo/distrito, múltiples perfiles y deduplicación. |
| 7. Tarjetas de usuarios | Foto disponible o iniciales, estado, correo, distrito, perfiles y gestión de solicitudes de la cuenta seleccionada. |
| 8. Agenda | Fecha y todas las canchas o una cancha del complejo. Nombres completos y controles responsive. |
| 9. Estados de turnos | Libre, alquilado, pendiente y mantenimiento con texto y color; precios reales, cliente y pagos de reserva. Alquiler solo para turnos futuros disponibles y publicados. |

## Contratos y despliegue

- Crear organización ahora requiere `name`, `districtCode`, `address`; frontend y backend deben desplegarse juntos.
- Flyway ejecuta `V33__organization_location_identity.sql`. Hacer respaldo normal antes del despliegue; no se borran sedes anteriores.
- Nuevos GET contextuales: `/organizations/{id}/overview`, `/staff`, `/schedule?date=YYYY-MM-DD&spaceId=UUID` (cancha opcional).
- Asignación de responsables acepta `role: OWNER | ADMIN`, con OWNER por compatibilidad si se omite.
- La agenda es un modelo de lectura; el flujo existente de reserva vuelve a validar disponibilidad al reservar. No se elimina la protección contra concurrencia.
- Gestión de privilegios sigue el proceso de solicitudes aprobado; una cuenta sin solicitudes muestra un estado vacío explicativo.

## Verificación

TypeScript, ESLint y 27 pruebas frontend sin errores. Suite backend: 160 pruebas, sin errores y 5 omitidas por configuración existente. Consultas y migración verificadas adicionalmente con PostgreSQL embebido: duplicados normalizados, otra ubicación permitida, aislamiento de complejo, cuatro estados y vencimiento de retenciones.

Las pruebas de presentación usan API simulada; no equivalen a validación de servicios desplegados en Render/Vercel. No se modificó producción ni la configuración de autenticación.
Presentación verificada en navegador a 320, 393 y 1280 px: sin desbordes horizontales en consola, complejos y agenda; filtro de dueños y alquiler exclusivo de turno libre comprobados.

## Ajuste posterior: Actividad y ubicación global

Actividad reutiliza el encabezado de Explorar con imagen y pestañas integradas. El selector superior muestra distritos de sedes publicadas desde GET /venues/districts y conserva la elección en el navegador. Los catálogos de partidos y canchas usan distrito exacto; solicitudes privadas y reservas personales no se filtran. Los aliados comerciales se filtran por su zona configurada (texto exacto, sin inferir ubicación por dirección). Elegir zona no recarga ni desmonta formularios.

## Distritos normalizados (2026-10-03)
Crear complejos y editar sedes usan un selector de los diez distritos oficiales de la provincia de Piura. GET /venue-catalogs/districts entrega el catálogo compartido; el backend valida y guarda el nombre canónico. V34 normaliza nombres conocidos y conserva ubicaciones ambiguas o con conflictos para revisión, sin borrar registros. Los filtros públicos muestran solo distritos reconocidos con sedes publicadas, sin variantes de mayúsculas/tildes. Sectores como Los Ejidos pertenecen a la dirección. Fuente: https://www.gob.pe/34822-distritos-de-la-provincia-de-piura

Crear complejo: el formulario permanece oculto hasta pulsar Crear complejo, incluso sin complejos registrados. Se abre como diálogo modal responsive con cierre, Cancelar y Escape, foco nativo contenido y desplazamiento independiente.

Popups: apertura común desde abajo y fondo desenfocado para crear complejo, gestionar jugadores, horarios de cancha y confirmar cupos. En móvil se ajustan al borde inferior y respetan el área segura. Se desactivan las animaciones con prefers-reduced-motion.

Responsive ubicación y menú: la animación del selector conserva su centrado horizontal; límites del popup según viewport, opciones sin ancho mínimo y navegación en cinco columnas sin desbordamiento. Selección activa con verde sutil.

Tarjetas Mis complejos: columna explícita de ancho completo, contenido y Abrir panel estirados dentro de la tarjeta. El listado ocupa el ancho disponible al mover la creación al popup.

Panel del complejo: selector Equipo/Operación reutiliza homeModeSwitch. Equipo contiene responsables e invitaciones; Operación contiene listas Sede/Cancha/Horarios. Crear y editar sede/cancha y registrar horario/excepción abren FormSheet con efecto desde abajo, desenfoque y foco modal nativo; cerrar mantiene el formulario montado. Horarios ordenados por día y hora. Se mantienen permisos por rol y solicitudes existentes.

Cabecera del panel del complejo: reutiliza hybridHero y homeModeSwitch del inicio con imagen referencial de cancha, degradado, título compacto y selector Equipo/Operación. La imagen actual es referencial: aún no existe carga de fotos de sedes/canchas en este módulo; se propone portada por sede y galería por cancha con almacenamiento externo persistente y validación por tenant.

Corrección cabecera complejo: hybridHome heredaba min-height:100vh y dejaba una pantalla vacía antes de Operación. complexPanelHero limita su altura al contenido, sin alterar la portada del inicio.

Horario semanal: día, franja horaria, precio y duración en líneas separadas; estado traducido y acciones independientes, debajo en móvil. Precio destacado sutilmente en verde.

### Edición de horarios semanales
- Cada horario incluye Editar para propietarios y administradores, incluso si está inactivo.
- El formulario inferior precarga día, horas, duración, precio y vigencia; guardar conserva su estado y no modifica reservas existentes.
- PUT availability-rules/{ruleId} valida organización, cancha, permisos, versión y superposición con otros horarios activos.


### Reservas del propietario y posición de popups
- Banner de reservas reutiliza hybridHero, imagen referencial y selector homeModeSwitch del panel del complejo.
- Malla consulta importes PAID en payment_orders; reservations no tiene paid_minor. Consulta comprobada contra PostgreSQL local con EXPLAIN.
- Popups móviles dejan 84 px más safe-area sobre el menú, con altura limitada y scroll interno; incluye FormSheet, crear complejo, jugadores, checkout y selector de cancha.
- Formulario semanal aplica validación nativa; API devuelve detalles comprensibles para campos inválidos o formatos incorrectos.


### Reactivar horarios
- Horarios inactivos muestran Activar para OWNER y ADMIN. POST availability-rules/{ruleId}/activate valida permisos, cancha, versión y superposiciones antes de activar y auditar.
- Desactivar refresca las reglas para conservar la versión actual y permitir reactivar o editar sin recargar.


### Alcance del filtro de distritos
- El selector del header solo aparece en Explorar y los catálogos de partidos/canchas. Se oculta en gestión, creación, actividad, perfil, detalles y Tercer tiempo.
- Tercer tiempo independiente lista todos los aliados para no aplicar un filtro oculto; su sección dentro de Explorar conserva el filtro seleccionado.


### Pago de reserva sin controles duplicados
- ReservationCheckout tiene un solo bloque de aceptación, importe y acción de pago. En móvil permanece fijo sobre el menú; en escritorio y listas generales se integra al contenido.
- Tu reserva conserva selección de adelanto/completo y Yape/Plin. Pagar requiere aceptación y checkoutReady, mantiene estado busy y retomar pago pendiente.
- Espacio inferior ampliado para evitar que el bloque fijo tape contenido.


### Pago fijo en Mis reservas
- La lista selecciona inicialmente la primera reserva con pago disponible. Seleccionar para pagar cambia la reserva activa; solo su checkout muestra métodos, aceptación e importe en la barra fija móvil.
- Las otras reservas conservan resumen y acciones de gestión, sin barras de pago duplicadas.
