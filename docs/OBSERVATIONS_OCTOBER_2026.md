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

### Crear y gestionar pichangas
- Crear muestra un banner con fotografía y dos opciones: Partidos creados (consulta /matches/mine filtrada por el organizador autenticado) y Crear partido.
- Formulario en FormSheet con dos pasos: datos/cupos/visibilidad/política y cancha/publicación. Se mantiene selección de reserva al final y validación de capacidad.
- Vista previa se abre por botón en otro FormSheet y puede cerrarse sin perder el borrador. Borradores antiguos migran de cuatro a dos pasos con flowVersion=2.
- Al publicar se vuelve al listado actualizado y se prepara un formulario nuevo. Cerrar sin publicar conserva el avance.

### Seguridad, privacidad y accesibilidad — 9 de octubre de 2026
- Revisión estándar de límites de confianza OIDC, permisos por usuario/complejo, pagos simulados, carga de imágenes e infraestructura versionada. Cuatro fallos de la versión inicial corregidos: imágenes de negocios no publicados, lecturas de administradores inactivos, identidad pública de organizadores con perfil privado y reactivación/permisos de usuarios existentes durante bootstrap Keycloak.
- Invitaciones a complejos requieren correo verificado. API stateless, límite compartido de escrituras en PostgreSQL con migración V35 y límites de profundidad/tamaño JSON. La limpieza de contadores se ejecuta cada hora para registros mayores a 24 h.
- Páginas versionadas de privacidad, cookies, términos y cancelaciones, aceptación exacta y renovable de versiones; distrito de perfil opcional. Datos legales reales pendientes por decisión del usuario para la demo. No se incorporaron analíticas ni cookies opcionales.
- Enlaces legales, salto al contenido, foco visible, contención/restauración de foco en diálogos y mensajes de error persistentes. Pruebas locales axe/teclado para distintos anchos y roles usan API y sesiones sintéticas; no validan Auth0 real ni certifican WCAG.
- Sustituidos recursos visuales sin acreditación por SVG originales referenciales; originales en cuarentena local fuera de public y del índice. Calificaciones identificadas como información del complejo, sin reseñas verificadas ficticias.
- Next actualizado a 16.3.8 con dependencias de producción corregidas; permanecen avisos de herramientas de desarrollo que no deben resolverse degradando Next.
- Operación y requisitos externos: docs/DEMO_SECURITY_OPERATIONS.md. Procedencia de recursos: docs/ASSET_PROVENANCE.md. Pendientes: MFA efectivo en Auth0, migración/comprobación PostgreSQL, políticas de conservación, respaldo cifrado/restauración, canales legales y revisión con lector de pantalla.

### Pagos externos con revisión — 22 de octubre de 2026
- Nuevo modo external_manual, separado de simulation/disabled; sin pasarela ni lectura de cuentas bancarias. El receptor confirma manualmente tras comprobar sus movimientos.
- Envío privado de JPG/PNG recodificado, metadatos en PostgreSQL, puerto PaymentProofStorage con adaptador filesystem y volumen Docker persistente. Nunca se publican URLs estáticas de comprobantes.
- Pagador consulta su evidencia; solo organizador del partido o OWNER activo del complejo revisa. Capacidad/horario, saldo, idempotencia, referencias duplicadas y cambios de receptor se validan en servidor.
- Configuración del dueño disponible antes de tener reservas; configuración del organizador por partido. El envío queda ligado a la versión del destino mostrado; si cambió, se solicita atención del receptor sin repetir transferencia.
- Estados de revisión, corrección con historial, resolución tardía y limpieza configurable de imágenes terminales (90 días predeterminados). Un pago tardío nunca recupera un cupo/horario liberado.
- Mis reservas y Mis inscripciones conservan solicitudes con evidencia aunque hayan vencido; no confunden pendiente con recaudado. Simulación no puede aprobar órdenes externas al cambiar de modo.
- Contrato: docs/openapi-external-payments.yaml. Operación/despliegue: docs/EXTERNAL_PAYMENTS.md. ADR-007 documenta filesystem inicial y futura extensión S3.
- Verificación local: migraciones V35/V36 y cuatro casos de pagos de dominio sobre PostgreSQL 18 aislado; 32 pruebas frontend, seis flujos sintéticos de navegador y 51 escenarios axe sin desbordamientos ni infracciones detectadas. Flyway advierte que su versión está probada hasta PostgreSQL 17; los manifests de producción conservan PostgreSQL 17.

## 23 de octubre: Supabase para demo y salida a VPS

- Supabase se utiliza como PostgreSQL externo; Auth0 y la autorización de Spring se conservan.
- Decisión final del usuario: Render no es recuperable; iniciar datos nuevos en Supabase, conservando Auth0. Ya no se exige recuperar/importar la fuente.
- DATABASE_URL explícita prevalece sobre la variable heredada de Render; el Blueprint deja de depender de la base gratuita vencida.
- Credenciales separadas para Flyway y ejecución, bootstrap de permisos y prerrequisito btree_gist para restauración.
- Se agrega variante VPS con PostgreSQL externo; se conserva la variante con PostgreSQL privado local.
- Guía: docs/SUPABASE_MIGRATION.md. Demo nueva inicializada en Supabase 17.11, sin importar Render; no se exige respaldo de la fuente por decisión final del usuario.
- Verificación local: Maven, contrato de arranque, Compose, 36 migraciones, health UP y dump/restore PostgreSQL 18 a 18 con permisos limitados. No equivale a migración remota realizada.
- Verificación remota posterior (23 de octubre, 22:28 America/Lima): Render Live en commit 438117b; API pública health UP; 36 migraciones correctas y 35 tablas en Supabase; usuario de ejecución con acceso a datos y sin CREATE. Cero usuarios al validar: los perfiles y datos demo se crearán con las cuentas Auth0 existentes. Pagos siguen en simulación; falta validar el flujo autenticado desde Vercel.
- Se detectó y reprodujo con PostgreSQL real un fallo por primeras peticiones concurrentes (usuario duplicado/transacción abortada). CurrentUserService bloquea por subject y vuelve a leer antes de insertar; la regresión comprueba ambas respuestas, un usuario y un perfil. Suite backend y prueba de concurrencia activada sin fallos antes de publicar el ajuste.
- Corrección 91fe1e9 desplegada Live en Render (dep-dbe2ii0ae00c73bea43g) y health público UP a las 22:46 del 23 de octubre (America/Lima). Maven clean verify: 224 pruebas, 0 fallos/errores, 10 omitidas; regresión real de concurrencia activada. Configuración remota e índice quedan documentados; no se han cargado complejos/partidos sintéticos ni validado consentimiento/login completo por cuenta del usuario.
- Solicitudes de perfil: tarjeta responsive con acciones debajo del contenido en móvil y dos columnas desde 768 px. Correos largos ajustan línea y botones conservan área táctil mínima de 44 px. Reproducido el desbordamiento anterior y verificado el CSS completo con contenido sintético pendiente/aprobado en 320, 393, 480, 768 y 1024 px sin overflow ni botones fuera de tarjeta; Prettier correcto. No se modifican permisos ni las decisiones de aprobación/rechazo.
- Mis canchas: el contador de complejos depende de la lista cargada, no de los resúmenes operativos. Los resúmenes se vuelven a consultar al crear un complejo; las respuestas parciales se conservan y los fallos ofrecen Reintentar resumen sin repetir el alta ni inventar importes/cantidades. Prueba de navegador reproduce el contador anterior en guion y valida creación y recuperación tras fallo 503 con identidad/API sintéticas locales; 32 pruebas frontend, tipos y lint correctos. Sin cambios backend ni permisos.
- Sedes: GPS rellena una dirección vacía con una referencia explícita de coordenadas, conserva una dirección escrita y el resto del borrador, y Maps utiliza el punto capturado. No se implementa geocodificación inversa ni se inventa una calle. El selector ya no se desmonta al cambiar coordenadas, conservando el mensaje de estado. Teléfono público con prefijo fijo +51, campo numérico de nueve dígitos y pegado de número con prefijo; envío canónico +51 seguido de nueve dígitos, vacío como null. Crear/editar sede valida en backend nueve dígitos con +51 opcional por compatibilidad; sin migración. Verificación: 34 pruebas frontend, tipos/lint, flujo de navegador con GPS/identidad/API simulados y suite backend (225 pruebas, 0 fallos/errores, 11 omitidas).
