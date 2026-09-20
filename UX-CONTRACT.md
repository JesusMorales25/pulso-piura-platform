# Pulso Piura — contrato de experiencia

## Notificaciones

- `FloatingNotice` es el componente canónico para confirmar acciones breves o comunicar fallos de una operación ya finalizada.
- En móvil se ubica sobre la navegación inferior y en escritorio bajo la cabecera; permanece fuera del flujo para no mover formularios ni botones.
- Éxito usa lima, información usa turquesa y error usa coral; icono y texto acompañan siempre al color.
- Se anuncia mediante región viva, incluye cierre accesible y desaparece a los 4.5 segundos.
- Los errores que requieren corregir un campo o tomar una decisión permanecen también junto al control afectado; una notificación flotante no sustituye esa explicación.
- Los estados de carga ocupan el control o la región que está cargando y no se presentan como notificaciones.
- Los catálogos usan esqueletos con la geometría de sus tarjetas para evitar saltos entre la carga y el resultado.

## Navegación principal

- En móvil siempre hay cinco destinos en el mismo orden: Explorar, Actividad, Crear, Tercer tiempo y Perfil.
- Explorar regresa al inicio donde viven Encontrar partido y Reservar cancha; no crea un tercer modo de búsqueda.
- Crear abre el flujo de pichangas. Si la cuenta aún no activó el modo organizador, explica el requisito y lleva directamente a la activación en Perfil.
- Las herramientas administrativas aparecen en Perfil o en su consola y nunca reemplazan los cinco destinos principales.
- En la ficha móvil de un partido, el precio y la acción de unirse permanecen visibles sobre la navegación; para eventos pagados la acción se habilita tras aceptar la política.
- Durante el checkout móvil de cancha, el importe y la acción de pago permanecen visibles sobre la navegación y reflejan los mismos estados de aceptación, preparación y procesamiento que el formulario principal.
- La barra inferior distribuye sus cinco destinos en columnas iguales desde 320 px; ningún rol cambia su orden o geometría.

## Perfil e identidad

- La foto proviene de la identidad federada sincronizada por Keycloak y no se edita mediante una URL introducida por el usuario.
- Si Google no entrega una imagen o esta no carga, se presenta el icono neutro de usuario.
- Guardar el perfil actualiza la cabecera inmediatamente y confirma la operación con una notificación flotante.

## Sesión

- La sesión autenticada sobrevive recargas dentro de la pestaña mediante almacenamiento de sesión y nunca usa almacenamiento permanente del navegador.
- El token de acceso dura 5 minutos y se renueva automáticamente; una sesión activa admite hasta 8 horas de inactividad y 24 horas de duración máxima.
- Un vencimiento intenta renovar antes de cerrar la sesión. Solo un fallo definitivo elimina la identidad local y solicita ingresar nuevamente.

## Reserva y actividad

- La reserva directa muestra una única pantalla estable mientras valida la cancha y crea el bloqueo; el catálogo y el selector de horarios no aparecen durante esa preparación.
- Una retención activa aparece en Actividad para permitir completar el pago dentro de sus 5 minutos.
- Las retenciones vencidas o canceladas sin pago se conservan internamente para concurrencia y auditoría, pero no se muestran en el historial del jugador.
- Las reservas confirmadas, completadas y canceladas con algún pago permanecen visibles.
