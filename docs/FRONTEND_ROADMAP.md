# Roadmap de experiencia web — Pulso Piura

**Fecha de corte:** 5 de septiembre de 2026  
**Canal:** aplicación web responsive, diseñada primero para celular  
**Regla de producto:** la interfaz solo presenta como operativas las capacidades respaldadas por la API.

## 1. Arquitectura de información aprobada

| Área      | Usuario principal   | Propósito                                                                          | Estado                                                               |
| --------- | ------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Inicio    | público/jugador     | descubrir la propuesta y complejos publicados                                      | implementado                                                         |
| Explorar  | público/jugador     | descubrir globalmente canchas y partidos y derivar al flujo especializado          | implementado visualmente; mapa y partidos parcialmente demostrativos |
| Gestión   | propietario/equipo  | organizaciones, miembros, sedes, canchas y disponibilidad                          | implementado                                                         |
| Actividad | jugador             | historial de reservas y partidos                                                   | historial de reservas implementado; partidos pendientes              |
| Perfil    | usuario autenticado | identidad, distrito, presentación y privacidad; acceso exclusivo desde la cabecera | implementado                                                         |

`Explorar` y `Gestión` son conceptos distintos. Un jugador puede explorar el catálogo sin ser
miembro de una organización. `Gestión` reemplaza el rótulo ambiguo `Complejos` y requiere identidad
y permisos contextuales cuando se accede a una organización.

`Explorar` es el agregador transversal: responde “qué puedo jugar cerca” y permite filtrar Todo,
Canchas o Partidos. No confirma reservas ni administra cupos directamente; cada resultado conduce
al flujo especializado correspondiente. Las ubicaciones del mapa serán reales cuando el backend
incorpore coordenadas y un contrato de búsqueda unificada.

## 2. Sistema visual aplicado

- fondo azul medianoche y superficies azul petróleo;
- cian como color primario para navegación, foco y acciones;
- lima reservado para estados futuros o llamadas promocionales secundarias;
- fotografía deportiva nocturna como lenguaje de marca;
- iconografía Phosphor consistente, sin símbolos improvisados;
- tarjetas y controles con objetivos táctiles de al menos 44 px;
- navegación inferior persistente en celular y barra horizontal en escritorio;
- responsive web: no se crea ni se simula una aplicación nativa.
- la portada de reservas no mezcla partidos abiertos; cada modo conserva una responsabilidad única;
- la portada de partidos no incorpora un catálogo resumido de canchas: su objetivo es encontrar y
  completar encuentros; el cambio de modo es el único acceso principal a la reserva de canchas;
- la cabecera mantiene la ubicación centrada; sin sesión presenta logo, ubicación e `Iniciar sesión`,
  y con sesión sustituye ese CTA por la fotografía real del perfil OIDC (incluida la de Google);
  el menú inferior no repite el acceso a Perfil;
- Inicio no duplica el buscador: la búsqueda global de deporte, zona, cancha o partido pertenece
  exclusivamente a `Explorar`;
- ambos modos de Inicio conservan la misma altura y lenguaje fotográfico, con tres imágenes
  rotativas sin controles visibles; la rotación es ornamental y se detiene cuando el sistema
  solicita movimiento reducido;
- “Reserva protegida” y medios de pago pertenecen al flujo de pago, no a la agenda de canchas;
- los avisos de última hora son temporales, descartables y no bloquean la navegación.

## 3. Incremento visual entregado

1. Inicio conectado al catálogo público y saludo personalizado cuando existe sesión.
2. Búsqueda inicial por distrito con transición al catálogo.
3. Tarjetas de complejos con datos reales de backend y fotografías de marca.
4. Catálogo, filtros, selección de cancha y slots adaptados al nuevo sistema visual.
5. Navegación renombrada y estado activo por ruta.
6. Gestión, perfil, autenticación y estados vacíos integrados al tema oscuro.
7. Módulo de partidos presentado únicamente como `Próximamente`.
8. Primera experiencia visual de “El tercer tiempo” con choperías, bares y restaurantes de demostración; el directorio, campañas y métricas continúan fuera del backend del MVP actual.

## 4. Secuencia funcional siguiente

### Fase F1 — Cierre de reservas simples

- implementar bloques 4C y 4D de la Iteración 4;
- consumir `bookable-slots`, crear el hold e informar su vencimiento;
- login diferido al intentar reservar;
- confirmación/cancelación e historial en Actividad;
- estados visibles: cargando, conflicto, vencido, reintento y éxito;
- E2E concurrente de dos usuarios sobre la misma franja.

**Avance 2026-09-05:** selector reservable, login diferido, hold, contador, confirmación,
cancelación e historial propio implementados. Falta el E2E concurrente y la validación visual a
360 px para cerrar F1.

### Fase F2 — Partidos abiertos y cupos

- crear, editar y publicar partido vinculado a una reserva;
- compartir enlace por WhatsApp sin depender de grupos para administrar cupos;
- unirse, retirarse, lista de espera y reemplazo;
- mostrar ocupación real y reglas del encuentro;
- incorporar `Crear` como acción principal solo cuando exista el caso de uso.

### Fase F3 — Confianza y operación

- asistencia y cierre del partido;
- reputación y verificación con reglas antiabuso;
- notificaciones y recordatorios;
- revisión de roles/permisos basada en casos de uso, sin romper el aislamiento multitenant.

### Fase F4 — Pagos Yape/Plin

- integrar PaymentOrder con el proveedor seleccionado;
- QR o checkout interoperable para Yape/Plin;
- webhook, idempotencia, conciliación y contingencia manual;
- nunca almacenar credenciales, PIN ni imágenes como prueba automática de pago.

### Fase F5 — Mini campeonatos y ecosistema local

- torneos, equipos, fixture, resultados y tabla, condicionados al piloto;
- comercios cercanos y beneficios post-partido como módulo separado y condicionado a demanda;
- métricas agregadas, consentimiento y reglas publicitarias antes de monetizar.

**Avance visual 2026-09-05:** se incorporó la sección móvil de “El tercer tiempo” con
contenido explícitamente marcado como demostración. No habilita altas de comercios, campañas,
beneficios, enlaces externos ni seguimiento hasta implementar y validar US-110–US-112.

## 5. Criterios de aceptación para cada pantalla

- usa exclusivamente contratos existentes o documenta el contrato nuevo antes de implementarlo;
- no expone controles que terminarán inevitablemente en error por falta de backend;
- respeta autenticación, propiedad del recurso y tenant;
- contempla carga, vacío, error, éxito y reintento;
- funciona con teclado, zoom y un ancho mínimo de 360 px;
- conserva contraste, foco visible y etiquetas accesibles;
- supera lint, typecheck, build, pruebas de integración y E2E proporcional al riesgo;
- actualiza OpenAPI, amenazas, planning y checklist cuando cambia alcance.

## 6. Decisiones diferidas

- matriz definitiva de roles y permisos;
- proveedor de pagos y políticas comerciales;
- reputación/verificación del organizador;
- directorio de comercios y modelo publicitario;
- aplicación móvil nativa, que no forma parte del MVP actual.

## 7. Propiedad de controles de entrada

Para el MVP web móvil se acepta explícitamente que los controles `select`, fecha y hora sean
nativos. El sistema operativo o navegador es responsable de la geometría del desplegable,
localización, teclado y selector; Pulso Piura mantiene la etiqueta, ayuda, error, contraste y
estado de foco del campo. Esta decisión está registrada en `premium-ui.json` y evita crear
controles ARIA propios sin una librería accesible mantenida. Un selector visual completamente
personalizado será una evolución independiente del sistema de diseño y exigirá pruebas de
teclado, foco, colisión, localización y dispositivos reales.
