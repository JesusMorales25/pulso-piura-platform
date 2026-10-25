# 27. Panel de complejos deportivos

## Objetivo

Permitir que un complejo controle disponibilidad, reservas y operación sin convertir el producto en un ERP completo.

## Inicio/Resumen

Indicadores iniciales:

- reservas de hoy;
- horas ocupadas/libres;
- holds y pagos pendientes;
- cancelaciones recientes;
- próximos partidos abiertos;
- incidencias que requieren atención.

Evitar métricas financieras avanzadas hasta validar calidad y fuente de datos.

## Calendario

Vistas:

- día por cancha;
- semana por cancha;
- lista móvil.

Acciones:

- crear reserva manual;
- abrir detalle;
- bloquear por mantenimiento;
- mover/reprogramar con advertencias;
- filtrar por estado/canal.

Colores siempre acompañados de etiqueta o icono accesible.

## Reservas

Tabla/lista con:

- código;
- fecha/hora/cancha;
- cliente mostrado según permiso;
- origen;
- estado;
- total/adelanto/saldo;
- próxima acción.

Operaciones masivas se posponen salvo necesidad validada.

## Sedes y canchas

- crear/editar sede;
- canchas y deportes;
- modalidad/capacidad;
- horario regular;
- excepciones;
- precios;
- fotos públicas;
- vista previa antes de publicar.

## Partidos abiertos

- ver partidos asociados a sus espacios;
- ofrecer una hora libre;
- contactar al capitán mediante plataforma;
- registrar ocupación originada;
- no editar participantes salvo rol explícito.

## Equipo y permisos

- invitar personal;
- asignar roles predefinidos;
- mostrar alcance de cada rol;
- suspender/revocar;
- historial de cambios;
- prohibir autoelevación.

## Reportes iniciales

- ocupación por cancha/franja;
- reservas por estado/origen;
- cancelaciones;
- demanda generada por plataforma;
- saldos operativos registrados;
- exportación restringida y auditada.

## Configuración

- información pública;
- canales de contacto;
- políticas dentro de límites;
- adelantos;
- anticipación;
- notificaciones;
- privacidad y responsables.

## Permisos por sección

| Sección | Permiso |
|---|---|
| Resumen | `org:read` |
| Calendario | `reservation:read` |
| Crear/editar reserva | `reservation:create/update` |
| Sedes/canchas | `venue:create/update` |
| Pagos operativos | `payment:read:org/record` |
| Equipo | `membership:manage` |
| Reportes/exportar | `report:read`, `data:export` |

## Fuera del MVP

- contabilidad general;
- planillas;
- facturación electrónica propia;
- inventario completo de bar/tienda;
- CRM de marketing avanzado;
- hardware de acceso;
- múltiples marcas personalizadas por cliente.


### Acceso desde el resumen

La tarjeta Canchas habilitadas abre las canchas publicadas de los complejos autorizados, identificadas por sede y complejo. Gestionar una cancha abre directamente sus horarios y precios; no vuelve a listar complejos. La lista contempla carga, vacío y reintento ante errores. Los identificadores del enlace se contrastan con las listas autorizadas del backend.

### Galería y publicación progresiva

El propietario o administrador autorizado puede cargar hasta 8 fotos JPG/PNG por cancha, seleccionar portada y retirar fotos con confirmación. Recomendamos al menos tres; por decisión del usuario se permite publicar primero y completarlas después. Las fotos solo se exponen públicamente si complejo activo, sede publicada y cancha publicada. Se normalizan en el backend y se guardan separadas de los comprobantes, en bucket privado; la API controla publicación y acceso. Explorar abre la galería bajo demanda.

Flujo: perfil propietario aprobado → crear complejo → registrar sede → crear cancha/deporte → horarios y precios → publicar sede y cancha. El catálogo de disponibilidad depende además del horario configurado para la fecha consultada. La cuenta receptora se configura en Reservas y pagos antes de recibir pagos externos. Las portadas globales se administran en Plataforma → Imágenes de plataforma.
