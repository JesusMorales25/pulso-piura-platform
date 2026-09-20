# Plan de evolución a partir de la revisión del cliente

Fecha de análisis: 2026-09-17  
Fuente: `Mejoras y Propuestas de Evolución F.pdf`  
Estado: ejecución en curso. E1, E2 y E3 están implementadas; E4 incluye ya la experiencia visual
de convocatoria, lista compartible y difusión por WhatsApp, pero conserva pendientes de avisos y
reemplazo automático.

## 1. Objetivo de producto

Pulso Piura debe reducir el trabajo que hoy ocurre por WhatsApp: encontrar jugadores, asegurar una
cancha nocturna, cobrar la cuota, reemplazar una baja y comprobar la llegada. La reserva sigue siendo
una capacidad central, pero la unidad de valor es la pichanga completa y su comunidad.

La experiencia se mantiene móvil, nocturna y local. El sistema priorizará horarios de 6:30 p. m. a
11:30 p. m., zonas conocidas por el usuario, disponibilidad real, precio por persona y atributos que
afectan la decisión en Piura: iluminación, sombra o techo, ventilación, grass, duchas y estacionamiento.

## 2. Decisiones que rigen el desarrollo

1. Un jugador con correo verificado puede activar con un botón la capacidad
   `MATCH_ORGANIZER`. No espera aprobación del administrador.
2. La activación permite crear y administrar únicamente sus propias pichangas. No concede permisos
   globales ni acceso a partidos de terceros.
3. Una revocación administrativa por moderación impide la reactivación automática.
4. `VENUE_OWNER` continúa sujeto a aprobación del administrador de plataforma y a membresía contextual
   en la organización correspondiente.
5. Una pichanga puede ser `PUBLIC`, `LINK` o `PRIVATE`. Solo `PUBLIC` aparece en Buscar partido;
   `LINK` se abre con su enlace; `PRIVATE` requiere invitación explícita.
6. Los cobros siguen en simulación hasta contratar un proveedor. Ninguna captura o retorno del
   navegador confirma dinero real. El bloqueo de reserva se mantiene en 5 minutos, según la decisión
   vigente del proyecto.
7. El lima se reserva para conversión, disponibilidad y confirmación; el cian identifica acciones
   secundarias, deportes y navegación.

## 3. Cobertura actual frente a la revisión

| Necesidad | Estado al 2026-09-17 | Trabajo pendiente |
|---|---|---|
| Encontrar partidos públicos y próximos | Implementado con filtros por deporte, zona, cupos y precio | añadir rango horario y cantidad total de jugadores cuando esos datos estén normalizados |
| Crear y administrar partidos propios | Autoactivación con correo verificado implementada | completar visibilidad e invitaciones privadas |
| Evitar doble inscripción y resolver cupos simultáneos | Implementado | conservar pruebas de concurrencia |
| Pago de inscripción Yape/Plin | Simulación implementada | integrar proveedor y webhooks cuando se contrate |
| Lista de espera y retiro del jugador | Implementado | reforzar el CTA visible “Liberar mi cupo” y sus consecuencias |
| Dashboard del organizador | Implementado | añadir invitaciones, deuda por jugador y reemplazos |
| Visibilidad pública/enlace/privada | Implementado | ampliar pruebas de navegador con dos cuentas reales |
| Invitaciones a una pichanga | Implementado con enlace ligado al correo | automatizar envío cuando exista proveedor de correo |
| Compartir por WhatsApp | Implementado para invitaciones y publicaciones públicas | automatizar envío cuando exista proveedor de mensajería |
| Reserva concurrente y bloqueo temporal | Implementado | mantener bloqueo exclusivo de 5 minutos |
| Adelanto 25 % o pago completo | Implementado en simulación | conciliación real pendiente de proveedor |
| Pase QR de reserva y lector del dueño | Implementado | conectar beneficios posteriores sin exponer datos en el QR |
| Catálogo de aliados / Tercer Tiempo | Implementado desde BD | promociones, vigencia y canje con pase |
| Panel móvil del dueño | Parcial | rejilla diaria y bloqueo rápido por teléfono |
| Chancha Digital por jugador | No implementado | obligaciones individuales y enlace de cobro compartido |
| Navegación inferior de cinco destinos | Implementado y validado | mantener pruebas visuales al modificar la navegación |
| Skeletons y estados estables | Implementado en catálogos, creación de pichanga, complejos y aliados | extender el patrón a las cargas secundarias restantes |
| Chips de atributos de la cancha | Implementado para datos configurados | ampliar el catálogo cuando se creen nuevos atributos |

## 4. Hoja de ruta de implementación

### Fase 0 — Confianza, acceso y alcance de las pichangas

Objetivo: cualquier jugador verificado organiza sin intervención operativa y cada tipo de partido se
expone solo a su audiencia.

- autoactivación auditable de `MATCH_ORGANIZER`;
- conservar aprobación administrativa de `VENUE_OWNER`;
- selector `Público / Con enlace / Privado` en la creación;
- invitaciones revocables con destinatario, estado y caducidad;
- acceso a partidos privados solo para organizador e invitados;
- catálogo público limitado a `PUBLIC`;
- enlace no indexado para `LINK` y sin tratarlo como secreto fuerte;
- pruebas 401, 403, propietario, invitado, revocación y aislamiento entre usuarios.

**Criterio de salida:** un jugador verificado activa la función, crea una pichanga de cada visibilidad,
invita a otra persona y ninguna cuenta ajena puede consultar o unirse a la privada.

Estado: implementado en backend y frontend. La entrega incluye selector de visibilidad, invitaciones
con vencimiento, aceptación ligada al correo verificado, revocación previa a la aceptación, copia del
enlace y autorización de consulta, inscripción y pago para pichangas privadas.

### Fase 1 — Descubrimiento local y ergonomía móvil

Objetivo: decidir y actuar con una mano, sin esperas ambiguas ni desplazamiento innecesario.

- navegación fija: Explorar, Actividad, Crear, Tercer Tiempo y Perfil;
- CTA inferior fijo en fichas de partido y cancha;
- skeletons que conserven la geometría durante carga;
- textos locales: “Asegurando tu cancha”, “Cancha confirmada” y “Pase validado en portería”;
- filtros por zona, deporte, número de jugadores, cupos, rango de precio y horario;
- atributos visuales: grass, LED, techo, ventilación, duchas, tribuna y estacionamiento;
- validación en 320, 393 y 768 px, teclado y lector de pantalla.

**Criterio de salida:** las tareas principales están a un toque de la navegación, las cargas no mueven
los controles y los filtros producen resultados desde datos reales.

Estado: implementado. La navegación de cinco destinos ocupa columnas estables; partidos y reservas
mantienen su CTA móvil sobre la navegación; los catálogos usan esqueletos; los filtros cubren
deporte, zona, cupos, tamaño, horario y precio; las canchas muestran sus atributos configurados. La
interfaz fue medida sin desbordamiento en 320, 393 y 768 px y su recorrido principal fue comprobado
con teclado y árbol de accesibilidad.

### Fase 2 — Coordinación de la pichanga

Objetivo: reemplazar la coordinación manual dispersa.

- compartir por WhatsApp con fecha, cancha, modalidad, cuota, cupos y enlace;
- tablero de invitados: invitado, aceptó, pagó, rechazó o venció;
- “Liberar mi cupo” con confirmación y promoción automática de lista de espera;
- avisos de baja y cupo liberado;
- posición preferida y composición del equipo como dato opcional, sin puntuar habilidad.

**Criterio de salida:** el organizador conoce en una pantalla quién asistirá, quién pagó y cuántos cupos
faltan, y puede cubrir una baja sin editar listas manuales.

Estado: parcial. Ya existen invitaciones por correo con enlace, copia/WhatsApp, participantes, pagos,
retiro y lista de espera. El panel genera una lista de jugadores/pagos para copiar y un mensaje
público completo para WhatsApp con fecha, cancha, cuota, cupos y enlace. Faltan avisos automáticos y
el flujo explícito de reemplazo desde el panel.

### Ajuste visual aplicado desde las propuestas

- creación de pichanga reorganizada en cancha, partido, cupos y publicación, con resumen vivo;
- capacidad, precio, visibilidad, cancha y horario permanecen visibles antes de publicar;
- errores operativos de publicación usan la notificación flotante canónica y desaparecen a los 4.5 segundos;
- Actividad presenta partidos, reservas y pases QR como un espacio de pases digitales;
- Tercer Tiempo adopta la jerarquía editorial de la propuesta sin inventar descuentos aún no modelados;
- navegación inferior protegida en Crear y diseño sin desbordamiento desde 320 px.

### Fase 3 — Chancha Digital

Objetivo: repartir el costo sin que el organizador concilie capturas.

- cuota individual calculada y regla explícita para redondeo o saldo del organizador;
- obligación de pago por participante y estado independiente;
- enlace de pago único por participante o invitación;
- conciliación simulada usando la abstracción actual;
- idempotencia, historial y métricas de pagado/pendiente;
- integración real únicamente mediante proveedor contratado, webhook autenticado y conciliación.

**Criterio de salida:** en simulación, los pagos concurrentes actualizan una sola obligación, nunca
duplican el cupo y la suma conciliada coincide con el importe requerido.

Estado: no iniciado como módulo de cuota individual. La infraestructura de pagos simulados e
idempotencia existente sirve como base, pero todavía no representa obligaciones separadas por
participante.

### Fase 4 — Operación express del complejo

Objetivo: que el dueño opere desde el teléfono con la rapidez de un cuaderno.

- agenda diaria por cancha y hora;
- estados libre, bloqueada, retenida, confirmada, llegada y completada;
- bloqueo rápido con motivo “reservada por teléfono” y trazabilidad;
- lector QR integrado al flujo de llegada;
- saldo visible desde la reserva, sin incluir información financiera en el QR;
- métricas diarias de ocupación, ingresos registrados y saldos pendientes.

**Criterio de salida:** el dueño bloquea una hora, valida una llegada y encuentra la siguiente reserva
en menos de tres acciones, sin poder operar otro complejo.

Estado: parcial. La gestión de disponibilidad, reservas, pagos y validación QR ya existe. Falta la
agenda diaria compacta, el bloqueo telefónico rápido y las métricas operativas del día.

### Fase 5 — Tercer Tiempo y retención

Objetivo: conectar actividad deportiva con aliados cercanos sin debilitar privacidad ni control.

- promociones con vigencia, sede, condiciones y cupo;
- desbloqueo después de una participación o reserva completada;
- código de canje opaco, de un uso y con vencimiento;
- panel administrativo de publicación, pausa y métricas agregadas;
- consentimiento y minimización de datos para cualquier comunicación comercial.

**Criterio de salida:** un pase elegible canjea una promoción una sola vez y el aliado no recibe datos
personales que no necesita.

Estado: parcial en catálogo. Los negocios y su ubicación/contacto se publican desde la base de datos;
promociones, elegibilidad y canje todavía no están implementados.

## 5. Orden de entregas

| Entrega | Estado | Alcance | Dependencias | Riesgo principal |
|---|---|---|---|---|
| E1 | Implementada | autoactivación y separación de permisos | correo verificado en Keycloak | reactivar cuentas moderadas; se bloquea si están revocadas |
| E2 | Implementada | visibilidad e invitaciones | E1 | falta prueba E2E con identidades reales en el entorno desplegado |
| E3 | Implementada | navegación, skeletons, CTA y filtros | APIs existentes + datos de atributos | mantener consistencia al incorporar nuevos atributos |
| E4 | Parcial | WhatsApp, bajas y reemplazos | E2 | enlaces filtrados; privados requieren autorización real |
| E5 | Pendiente | Chancha Digital simulada | E2 + capa de pagos | redondeo, idempotencia y conciliación |
| E6 | Parcial | agenda express del dueño | reservas + permisos por organización | cruces de tenant y conflictos horarios |
| E7 | Pendiente | promociones y canje | pases completados + aliados | fraude de replay y uso de datos sin consentimiento |

## 6. Validación transversal

Cada entrega debe incluir:

- reglas de negocio en backend, sin confiar en botones ocultos;
- control por usuario, organización, recurso y estado;
- operaciones críticas transaccionales e idempotentes;
- registro de auditoría de activaciones, invitaciones, cobros, bloqueos y canjes;
- estados de carga, vacío, error y éxito;
- pruebas de concurrencia donde haya cupos, horarios o pagos;
- revisión responsive y accesible;
- métricas sin datos sensibles: conversión, tiempo para completar, abandono y errores por etapa.

## 7. Fuera de alcance hasta decisión comercial

- cobros reales o split automático sin proveedor contratado;
- puntaje competitivo de habilidad;
- bot de WhatsApp que lea conversaciones o contactos;
- entrega de teléfonos de jugadores a terceros;
- promociones basadas en seguimiento de ubicación en segundo plano.

La evolución conservará el proveedor de pagos desacoplado y el pase QR opaco. Estas restricciones
permiten avanzar en simulación sin crear una falsa confirmación financiera ni exponer información
personal.
