# Mejoras de partidos, reservas y experiencia movil

Fecha: 2026-09-27

Estado: aprobado para planificacion
Fuente funcional: observaciones de `Mejoras Pulso Piura 2 Visual (1).pdf` y confirmaciones posteriores del responsable del producto.

## 1. Objetivo

Mejorar el descubrimiento de partidos y canchas, hacer visible y coherente la obligacion de pago del organizador cuando participa, y reorganizar la reserva de cancha para que funcione con claridad en celular.

El resultado debe conservar la arquitectura SaaS multicomplejo, la autorizacion contextual, la disponibilidad calculada en backend y los pagos simulados mientras no exista un proveedor contratado.

## 2. Decisiones confirmadas

1. Se implementan los doce requerimientos identificados en la revision visual.
2. El organizador no se excluye automaticamente. La opcion `Yo tambien juego` permanece configurable y se activa por defecto.
3. Cuando el organizador juega, ocupa un cupo y su cuota forma parte de pagos, recaudacion y deuda pendiente.
4. El organizador puede pagar su cuota desde la ficha del partido mediante el mismo flujo simulado de Yape o Plin. Mientras no pague, debe aparecer como pendiente.
5. El catalogo publico muestra unicamente turnos disponibles. Los turnos reservados solo son visibles para quien los reservo y para el personal autorizado del complejo.
6. El adelanto de reservas nuevas cambia de 25 % a 20 %. Las reservas existentes conservan el importe persistido al crearse.
7. La calificacion de un complejo sera configurable por administracion durante esta etapa. No representa todavia valoraciones verificadas de usuarios.
8. La interfaz se mantiene web responsive mobile-first; no se crea una aplicacion nativa.

## 3. Alcance funcional

### 3.1 Descubrimiento de partidos

- Ordenar los partidos publicados y futuros por fecha y hora ascendente.
- Marcar visualmente el partido mas cercano a la hora actual.
- Mantener visibles fecha, hora, cupos, organizador y cuota.
- Dar mayor jerarquia visual a la cuota por jugador sin depender solo del color.
- Mantener filtros existentes y evitar que el indicador de proximidad cambie el orden transaccional o los cupos.

### 3.2 Participacion y pago del organizador

- `Yo tambien juego` inicia activado al crear una pichanga.
- Si se conserva activado, `organizerCounts` es verdadero, el organizador consume un cupo y aparece en el control financiero.
- Si se desactiva antes de publicar, el organizador no consume cupo ni genera deuda.
- La obligacion del organizador reutiliza `match_join_orders`; no se crea un proveedor ni una tabla financiera paralela.
- El organizador puede crear y completar una orden para su propia cuota aunque ya ocupe el cupo logico del partido.
- Confirmar el pago del organizador no crea un segundo participante ni incrementa nuevamente la ocupacion.
- El panel del organizador expone una fila sintetica protegida para el organizador cuando `organizerCounts` es verdadero. Su estado financiero se obtiene de su orden mas reciente: `PAID`, `PENDING`, `UNPAID` o `NOT_REQUIRED`.
- La fila del organizador no admite retiro desde el control de participantes. Para cambiar si juega, se requiere una evolucion posterior del flujo de edicion del partido.
- Las metricas de participantes, pagos, recaudacion y por cobrar incluyen al organizador exactamente una vez.
- Los pagos confirmados conservan trazabilidad y no se convierten en pagos directos.

### 3.3 Zonas y filtros de cancha

- El filtro de zona usa los valores `districtCode` de complejos publicados y no una lista duplicada en frontend.
- La busqueda permite seleccionar todas las zonas o una zona especifica de Piura.
- Se agregan filtros por cancha techada o cubierta y por iluminacion LED.
- Los filtros se aplican sobre datos reales: `indoor` y codigos de amenidades del espacio o complejo.
- Si una combinacion no tiene resultados, se muestra un estado vacio con accion para limpiar filtros.

### 3.4 Visibilidad de turnos

- `/spaces/{spaceId}/bookable-slots` continua siendo la fuente publica de horarios.
- El endpoint solo devuelve franjas futuras que no se superponen con reservas bloqueantes vigentes.
- No se agregan estados `ocupado` o `reservado` al contrato publico.
- `Mis reservas` conserva el historial del usuario autenticado.
- El panel del complejo conserva la vista de reservas de su organizacion, validando membresia y tenant.
- Las pruebas deben demostrar que una reserva ajena no se filtra a otro usuario u organizacion.

### 3.5 Tarjeta y selector movil de reservas

La tarjeta toma como referencia la composicion aprobada: cabecera compacta del complejo, atributos, precio, turnos horizontales y resumen inferior.

- Cabecera con imagen existente, nombre, zona, calificacion configurable y precio inicial.
- Etiquetas compactas para deporte, formato y atributos relevantes.
- Seccion de turnos que solo contiene disponibilidad reservable.
- El turno elegido usa lima, borde de alto contraste, `aria-pressed=true` y texto `Elegido`.
- `Otros horarios` abre la seleccion completa sin crear una ruta nueva.
- El resumen inferior muestra cancha, rango elegido, duracion, total y acciones.
- Se ofrecen `Reservar con 20 %` y `Pagar completo` despues de seleccionar horario.
- Los controles principales tienen un area tactil minima de 44 por 44 px.
- La composicion no presenta desbordamiento horizontal en 320, 393 y 768 px.
- Los botones deben funcionar por toque, teclado y clic; los elementos interactivos no se anidan.

### 3.6 Detalle de cancha

- La vista expandida concentra nombre, direccion, zona, precio, calificacion, tipo de cancha, techo o cubierta, LED, estacionamiento y demas amenidades configuradas.
- La tarjeta compacta muestra solo los atributos de decision principales y evita duplicar toda la ficha.
- Los datos ausentes se omiten o se presentan como `No informado`; no se inventan valores.
- `Otros horarios` permanece disponible desde la tarjeta y desde el detalle.

### 3.7 Calificacion administrable

- Se agregan a la sede los campos opcionales `admin_rating` y `admin_rating_count`.
- `admin_rating` admite valores de 0.0 a 5.0 con una precision decimal.
- `admin_rating_count` admite enteros no negativos y representa una referencia administrada, no el conteo de reseñas verificadas.
- Solo roles autorizados dentro de la organizacion pueden modificar estos campos mediante los casos de uso actuales de sedes.
- Las vistas publicas pueden leerlos, pero no exponen controles administrativos.
- La interfaz publica identifica el origen con texto accesible, por ejemplo `Calificacion informada por el complejo`.
- La futura valoracion real reemplazara la fuente de lectura sin reutilizar estos campos como votos de usuarios.

### 3.8 Adelanto de reserva

- Las reservas creadas despues del cambio calculan `depositMinor` como el techo de 20 % del total en unidades minimas.
- `PaymentPlan.DEPOSIT` usa el `depositMinor` persistido de la reserva y no recalcula 25 %.
- El frontend usa el importe devuelto por backend y muestra `Adelanto 20 %`.
- El pago completo y el pago posterior de saldo siguen disponibles.
- Los registros existentes no se migran ni recalculan.

## 4. Arquitectura y cambios previstos

### Backend

- `matches`: adaptar la creacion, pago de inscripcion y consulta del organizador para incluir su obligacion sin duplicar ocupacion.
- `venues`: extender entidad, DTOs, servicios y persistencia con la calificacion administrada.
- `reservations` y `payments`: cambiar el calculo del adelanto para nuevas reservas y consumir el importe persistido.
- Flyway: nueva migracion para los campos de calificacion. No se modifica ninguna migracion aplicada.
- OpenAPI o documentacion contractual: actualizar los campos publicos y administrativos afectados.

### Frontend

- `MatchBuilder`: activar por defecto la participacion del organizador y explicar su efecto en cupo y pago.
- `MatchDetail` y `MatchOrganizerDashboard`: habilitar pago propio, reflejar deuda e incluirla en metricas.
- `HomeDashboard`, tarjetas y catalogo: ordenar por proximidad y resaltar cuota/proximo partido.
- `PublicVenueCatalog`: zonas, amenidades, tarjeta movil, selector de turnos, detalle y acciones de 20 % o pago completo.
- `VenueAdmin`: campos de calificacion con validacion y explicacion de origen.
- Estilos globales y modulos CSS: adaptar la referencia sin romper el sistema visual existente.

## 5. Seguridad y privacidad

- El backend calcula cupos, importes y estados; el frontend no es autoridad.
- El pago propio del organizador exige que el actor sea el creador del partido correspondiente.
- Una orden de otro usuario no puede consultarse ni confirmarse.
- La actualizacion de calificacion valida membresia, permiso y organizacion.
- Los horarios reservados no se devuelven en el endpoint publico.
- Las consultas privadas de reservas mantienen filtro por usuario o tenant.
- No se incorporan datos reales de pago ni se cambia el estado de simulacion.

## 6. Estados y errores

- Si el organizador ya pago, reintentar devuelve la orden existente de forma idempotente.
- Si no participa, el intento de pagar como organizador se rechaza.
- Si la cuota es cero, aparece como `Sin cuota` y no se crea orden.
- Si el horario deja de estar disponible antes del hold, la API responde conflicto y la interfaz refresca horarios.
- Si no existen horarios, se informa sin mostrar turnos ocupados.
- Si la calificacion no esta configurada, se muestra `Sin calificacion`.
- Los errores se presentan mediante los patrones de aviso existentes y conservan foco accesible.

## 7. Pruebas

### Backend automatizado

- El organizador cuenta una vez cuando participa.
- El organizador no cuenta ni adeuda cuando desactiva la opcion.
- Puede crear, reintentar y completar su orden sin generar otro cupo.
- Su pago aparece en recaudacion; la falta de pago aparece por cobrar.
- Otro usuario no puede operar su orden.
- El adelanto de una reserva nueva es el techo de 20 %.
- El pago de adelanto usa `depositMinor` persistido.
- La calificacion rechaza valores fuera de rango y cambios entre tenants.
- La disponibilidad publica omite turnos pasados y bloqueados.

### Frontend y contrato

- Filtros de zona, cubierta y LED producen la seleccion esperada.
- La tarjeta solo renderiza turnos disponibles.
- La seleccion de horario conserva un estado textual y accesible.
- Las acciones de 20 % y pago completo usan los importes del backend.
- La cuota y el indicador de partido proximo aparecen en las pantallas acordadas.
- TypeScript, ESLint y build de produccion pasan sin errores.

### Validacion visual

- Comparar la implementacion con la imagen de referencia en el mismo estado y viewport.
- Revisar 320, 393 y 768 px.
- Probar filtro, apertura de otros horarios, seleccion, reserva, pago y cierre del detalle.
- Revisar foco, teclado, contraste, texto ampliado y consola del navegador.

## 8. Documentacion y entrega

- Actualizar reglas de partidos, reservas, pagos, identidad visual y registro de decisiones.
- Regenerar `docs/CODEBASE_INDEX.md` si cambian rutas, modulos, controladores, migraciones o scripts.
- Crear un informe final en PDF con requerimientos, decisiones, archivos modificados, pruebas ejecutadas y capturas representativas del resultado movil.
- El PDF final se guarda bajo `output/pdf/` y se verifica visualmente antes de entregarlo.

## 9. Fuera de alcance

- Valoraciones reales, comentarios o moderacion de reseñas.
- Pagos reales, webhooks de un proveedor contratado o conciliacion bancaria.
- Aplicacion movil nativa.
- Mostrar publicamente horarios ocupados o la identidad de quien los reservo.
- Editar retroactivamente el porcentaje o importe de reservas ya creadas.

## 10. Criterios de aceptacion

1. El organizador participante ocupa exactamente un cupo y aparece pendiente hasta pagar.
2. Su pago modifica los mismos indicadores financieros que los pagos de otros jugadores.
3. El catalogo publico nunca revela un turno reservado o retenido vigente.
4. Las reservas nuevas ofrecen adelanto de 20 % y pago completo con importes calculados en backend.
5. La tarjeta movil reproduce la jerarquia de la referencia y funciona sin desbordamientos desde 320 px.
6. Zona, cubierta e iluminacion LED filtran datos reales.
7. La calificacion administrada respeta rango, permisos y tenant, y su origen no se presenta como reseña verificada.
8. Las pruebas relevantes de backend y frontend, el build y la validacion visual quedan documentados.
