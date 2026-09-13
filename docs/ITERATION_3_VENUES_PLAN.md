# Iteración 3 — Sedes, canchas y disponibilidad

**Estado:** en desarrollo — bloques 1 a 5 implementados  
**Objetivo:** permitir que una organización configure y publique sus sedes, canchas, horarios y precios sin implementar aún reservas ni pagos.

## 1. Alcance comprometido

### Incluido

- registrar, editar, publicar y archivar sedes;
- registrar, editar, activar y archivar canchas o espacios deportivos;
- configurar modalidades, superficies y amenidades mediante catálogos controlados;
- configurar horarios semanales y precios por franja;
- registrar excepciones por cierre, mantenimiento o precio especial;
- consultar catálogo público de sedes y canchas publicadas;
- filtrar por deporte, distrito y fecha;
- aplicar autorización por organización en cada operación;
- interfaz web mobile-first para administración y consulta pública;
- auditoría de cambios de configuración;
- pruebas de reglas, permisos y aislamiento entre tenants.

### Excluido

- crear reservas o bloquear horarios;
- cobrar con Yape, Plin o pasarela;
- calcular disponibilidad descontando reservas;
- partidos, cupos y listas de espera;
- promociones complejas, tarifas dinámicas o reportes financieros;
- carga de fotografías a almacenamiento externo.

## 2. Lenguaje del dominio

- **Organización:** tenant propietario de la operación.
- **Sede (`Venue`):** ubicación física de una organización.
- **Espacio deportivo (`SportSpace`):** cancha o ambiente reservable dentro de una sede.
- **Regla de disponibilidad:** horario semanal recurrente con duración y precio.
- **Excepción:** modificación puntual que cierra una franja o reemplaza su precio.

Una organización puede tener varias sedes y una sede puede contener varias canchas.

## 3. Decisiones de seguridad y multi-tenancy

1. `organization_id` estará presente en sedes, espacios, reglas y excepciones.
2. Ninguna operación administrativa confiará en un `organization_id` enviado sin validarlo contra la membresía activa.
3. Los repositorios administrativos consultarán por `id + organization_id`.
4. Los endpoints públicos devolverán únicamente recursos publicados y campos expresamente públicos.
5. Un UUID válido de otro tenant producirá `403` o `404` según el contrato, nunca datos parciales.
6. Archivar será una transición de estado; no se eliminarán registros operativos.
7. Las modificaciones usarán versionado optimista.

## 4. Permisos iniciales

| Acción | OWNER | ADMIN | OPERATOR | Público |
|---|---:|---:|---:|---:|
| Ver configuración interna | Sí | Sí | Sí | No |
| Crear/editar/publicar sede | Sí | Sí | No | No |
| Crear/editar/archivar cancha | Sí | Sí | No | No |
| Configurar horario y precio | Sí | Sí | No | No |
| Crear cierre operativo puntual | Sí | Sí | Sí | No |
| Consultar catálogo publicado | Sí | Sí | Sí | Sí |

La primera implementación reutilizará `MANAGE_ORGANIZATION` para configuración y `OPERATE` para cierres puntuales. Si la validación exige mayor granularidad, se agregarán permisos sin crear roles personalizados por cliente.

## 5. Modelo físico previsto

### `venues`

- `id`, `organization_id`, `name`, `slug`;
- `address`, `district_code`;
- `latitude`, `longitude` opcionales;
- `public_phone` opcional;
- `status`: `DRAFT`, `PUBLISHED`, `ARCHIVED`;
- `created_by`, `created_at`, `updated_at`, `version`.

Restricciones:

- nombre obligatorio, máximo 160 caracteres;
- slug único dentro de la organización;
- coordenadas válidas cuando existan;
- una sede archivada no admite nueva configuración.

### `sport_spaces`

- `id`, `organization_id`, `venue_id`, `name`;
- `sport_code`, `format_code`, `capacity`;
- `surface_type`, `indoor`;
- amenidades asociadas por código: iluminación, techo, vestuarios, duchas, estacionamiento e implementos;
- `status`: `DRAFT`, `PUBLISHED`, `ARCHIVED`;
- auditoría y `version`.

Restricciones:

- capacidad positiva;
- deporte y modalidad tomados de catálogos controlados;
- el espacio y la sede deben pertenecer a la misma organización;
- nombre único por sede mientras no esté archivado.

### `availability_rules`

- `id`, `organization_id`, `sport_space_id`;
- `day_of_week` ISO, de 1 a 7;
- `start_local_time`, `end_local_time`;
- `slot_minutes`, `price_minor`, `currency`;
- `valid_from`, `valid_to` opcional;
- `status`: `ACTIVE`, `INACTIVE`;
- auditoría y `version`.

### `availability_exceptions`

- `id`, `organization_id`, `sport_space_id`;
- `starts_at`, `ends_at` en UTC;
- `type`: `CLOSED`, `MAINTENANCE`, `SPECIAL_PRICE`;
- `price_minor` solo para precio especial;
- `reason` opcional, estado y auditoría.

## 6. Tiempo y precios

- La zona horaria se guardará como identificador IANA en la organización.
- Valor inicial para Piura: `America/Lima`.
- Reglas recurrentes usan hora local; instantes concretos se almacenan en UTC.
- `start_local_time` debe ser anterior a `end_local_time`.
- El slot inicial permitido será de 30 a 180 minutos.
- Los importes se guardarán en céntimos de PEN (`price_minor >= 0`).
- La API no usará números decimales para dinero.

## 7. API administrativa

| Método | Ruta | Propósito |
|---|---|---|
| GET | `/organizations/{orgId}/venues` | listar sedes internas |
| POST | `/organizations/{orgId}/venues` | crear sede borrador |
| GET | `/organizations/{orgId}/venues/{venueId}` | consultar sede autorizada |
| PUT | `/organizations/{orgId}/venues/{venueId}` | editar datos y versión |
| POST | `/organizations/{orgId}/venues/{venueId}/publish` | publicar sede |
| DELETE | `/organizations/{orgId}/venues/{venueId}` | archivar sede |
| POST | `/organizations/{orgId}/venues/{venueId}/spaces` | crear cancha |
| PUT | `/organizations/{orgId}/spaces/{spaceId}` | editar cancha |
| DELETE | `/organizations/{orgId}/spaces/{spaceId}` | archivar cancha |
| GET | `/organizations/{orgId}/spaces/{spaceId}/availability-rules` | listar reglas |
| POST | `/organizations/{orgId}/spaces/{spaceId}/availability-rules` | crear regla |
| POST | `/organizations/{orgId}/spaces/{spaceId}/exceptions` | crear excepción |

## 8. API pública

| Método | Ruta | Propósito |
|---|---|---|
| GET | `/venues` | buscar sedes publicadas |
| GET | `/venues/{venueSlug}` | ver información pública |
| GET | `/venues/{venueSlug}/spaces` | listar canchas publicadas |
| GET | `/spaces/{spaceId}/availability` | obtener slots teóricos para una fecha |

La disponibilidad de esta iteración es teórica: reglas más excepciones. La Iteración 4 descontará holds y reservas confirmadas.

## 9. Casos de error

- `400`: entrada o transición inválida;
- `401`: sesión ausente o vencida;
- `403`: rol sin permiso o acceso cruzado;
- `404`: recurso inexistente dentro del tenant autorizado;
- `409`: slug, nombre o versión en conflicto;
- `422`: configuración horaria coherente sintácticamente pero imposible de aplicar.

Todos usarán Problem Details y mensajes seguros para el usuario.

## 10. Pruebas obligatorias

### Dominio

- horario de inicio anterior al final;
- duración de slot dentro del rango;
- precio no negativo;
- transición válida de borrador a publicado y archivado;
- excepción de precio exige importe;
- sede archivada rechaza nuevas canchas.

### Autorización

- OWNER y ADMIN configuran;
- OPERATOR solo consulta y crea cierres puntuales;
- usuario externo no accede;
- miembro revocado no accede;
- administrador de A no lee ni modifica recursos de B.

### Persistencia e integración

- claves foráneas conservan el tenant;
- slugs únicos por organización;
- versionado optimista produce conflicto controlado;
- búsqueda pública excluye borradores y archivados;
- Flyway aplica la migración desde una base limpia.

### Frontend

- estados vacío, carga, error y éxito;
- formularios accesibles y utilizables en 360 px;
- acciones ocultas o deshabilitadas según rol;
- navegación sede → cancha → horarios sin usar UUID manualmente.

## 11. Orden de implementación

1. ✅ Crear migración Flyway y constraints multi-tenant.
2. ✅ Implementar agregado `Venue` y casos de uso administrativos.
3. ✅ Implementar `SportSpace` y catálogos iniciales.
4. ✅ Agregar reglas y excepciones de disponibilidad.
5. ✅ Publicar API administrativa, catálogos reutilizables y Problem Details.
6. 🟡 Construir panel web mobile-first (funcionalidad implementada; validación visual/E2E pendiente).
7. Implementar catálogo público y slots teóricos.
8. 🟡 Agregar auditoría, pruebas negativas y OpenAPI (auditoría y contrato completos para la API administrativa; pruebas de integración pendientes).
9. Demostrar el flujo y actualizar amenazas/checklist.

### Entrega del bloque 1 — 2026-09-04

- migración `V6` con zona horaria de organización, sedes y espacios deportivos;
- claves foráneas compuestas que impiden asociar una cancha con una sede de otro tenant;
- restricciones de coordenadas, capacidad, estados, slugs y nombres activos;
- API administrativa inicial protegida por membresía y permisos contextuales;
- catálogos deportivos iniciales controlados en código;
- pruebas unitarias de transiciones, coordenadas, capacidad y deportes admitidos.

La compilación del código principal fue satisfactoria. La ejecución de pruebas debe repetirse con
el backend detenido: Windows mantiene bloqueado `backend/target` mientras se ejecuta desde VS Code.

### Entrega del bloque 2 — 2026-09-04

- edición de sedes y canchas con versión esperada suministrada por el cliente;
- control optimista tanto en aplicación como mediante `@Version` en persistencia;
- publicación de canchas únicamente cuando su sede ya está publicada;
- archivo lógico de canchas y rechazo de modificaciones posteriores;
- respuestas `409` seguras para versiones obsoletas y carreras concurrentes;
- pruebas de versiones obsoletas y transiciones inválidas.

Los primeros tres pasos del orden de implementación quedaron terminados con este bloque.

### Entrega del bloque 3 — 2026-09-04

- migración `V7` para reglas semanales y excepciones puntuales;
- horas recurrentes expresadas en tiempo local y excepciones expresadas como instantes UTC;
- precios almacenados como enteros en céntimos y moneda fija `PEN`;
- validación de día, rango horario, duración de 30 a 180 minutos y vigencia por fechas;
- rechazo de reglas activas superpuestas para el mismo día y periodo;
- cierres, mantenimiento y precios especiales con estados explícitos;
- OWNER/ADMIN gestionan reglas y precios especiales; OPERATOR puede gestionar cierres y mantenimiento;
- acceso a reglas y excepciones delimitado por organización y cancha;
- pruebas unitarias de dinero, rangos, transiciones, superposición y selección de permisos.

El cuarto bloque documenta la API administrativa, incorpora auditoría de configuración y deja
preparado el alcance del panel web mobile-first.

### Entrega del bloque 4 — 2026-09-04

- contrato OpenAPI ampliado a 18 rutas con esquemas, parámetros y Problem Details reutilizables;
- auditoría de creación, edición, publicación y archivo de sedes y canchas;
- auditoría de creación/desactivación de reglas y creación/cancelación de excepciones;
- cada evento conserva actor, organización, tipo e identificador del recurso y resultado;
- los eventos no contienen direcciones, teléfonos, precios, motivos ni otros datos del formulario;
- compilación backend satisfactoria y validación sintáctica del YAML completada.

Antes del panel se añadirá una migración incremental para catálogos y amenidades aceptados tras la
revisión de requisitos. Después se construirá el panel administrativo web mobile-first para operar
sedes, canchas, horarios y excepciones sin utilizar UUID manualmente.

### Entrega del bloque 5 — 2026-09-04

- migración `V8` con catálogos globales de deportes, modalidades, superficies y amenidades;
- preservación de modalidades y superficies registradas antes de hacer obligatorio el catálogo;
- restricción de base de datos que exige una combinación válida de deporte y modalidad;
- amenidades asociadas a sedes o canchas mediante tablas con claves foráneas compuestas por tenant;
- validación de código activo y alcance `VENUE`, `SPORT_SPACE` o `BOTH` antes de persistir;
- endpoint autenticado `GET /api/v1/venue-catalogs` para alimentar formularios sin texto libre;
- altas, ediciones y respuestas de sedes/canchas ampliadas con `amenityCodes`;
- contrato OpenAPI 0.2.0 y pruebas unitarias de selección de catálogo incorporadas.

El código principal compila correctamente. Las pruebas automatizadas siguen afectadas por el
problema conocido del entorno Maven de pruebas, que no incorpora `target/classes` durante
`testCompile`, incluso en una copia limpia. Esto debe corregirse antes de cerrar la iteración.

El siguiente bloque es el panel administrativo web mobile-first para operar sedes, canchas,
horarios, precios y excepciones usando estos catálogos.

### Entrega del bloque 6A — 2026-09-04

- sección de sedes y canchas integrada en el panel de cada organización;
- navegación sede → canchas sin introducir identificadores manualmente;
- formularios responsive para crear sedes y canchas en estado borrador;
- modalidades filtradas por el deporte elegido y superficies tomadas del catálogo backend;
- amenidades separadas según su alcance de sede o cancha;
- estados de carga, vacío, éxito y error, y ocultamiento de altas para `OPERATOR`;
- `npm run typecheck` y `npm run lint` satisfactorios.

### Entrega del bloque 6B — 2026-09-04

- edición de sedes y canchas con la versión recibida del backend;
- actualización local de la versión después de cada respuesta satisfactoria;
- publicación explícita de sedes y publicación de canchas solo cuando su sede está publicada;
- archivo lógico con confirmación previa y conservación del recurso en el historial visual;
- formularios reutilizados para alta y edición sin duplicar reglas de presentación;
- acciones administrativas ocultas para `OPERATOR`, manteniendo autorización real en backend;
- corrección de carreras visuales al cambiar rápidamente entre sedes;
- `npm run typecheck` y `npm run lint` satisfactorios.

El bloque siguiente completa reglas semanales, precios y excepciones desde la interfaz.

### Entrega del bloque 6C — 2026-09-04

- selección explícita de cancha y carga aislada de su configuración de disponibilidad;
- creación y listado de reglas semanales con día, rango local, duración, precio y vigencia;
- importes ingresados en soles y enviados al backend como céntimos enteros de PEN;
- creación y listado de cierres, mantenimientos y precios especiales usando instantes UTC;
- desactivación y cancelación con versión optimista y confirmación previa;
- `OPERATOR` puede registrar cierres y mantenimiento, pero no horarios ni precios especiales;
- cambios rápidos entre sedes/canchas protegidos contra respuestas asíncronas obsoletas;
- diseño responsive de una columna para celular;
- `npm run typecheck` y `npm run lint` satisfactorios.

El panel administrativo está funcionalmente conectado. Falta ejecutar validación visual a 360 px y
pruebas E2E contra el backend reiniciado con la migración `V8`. El siguiente desarrollo funcional
es el catálogo público y el cálculo de slots teóricos.

### Entrega del bloque 7 — 2026-09-04

- migración `V9` con `public_slug` global, estable y sin exposición de identificadores internos;
- API pública de búsqueda por distrito, deporte y fecha, limitada a sedes y canchas publicadas;
- cálculo de slots en la zona horaria de la organización a partir de reglas semanales activas;
- exclusión de cierres y mantenimiento, y sustitución por precio especial cuando corresponde;
- el filtro por fecha exige al menos una franja teórica libre, no solo una regla configurada;
- catálogo global habilitado para consumo público, sin datos privados del tenant;
- vista web mobile-first `/canchas` con filtros, detalle, horarios y precios en soles;
- comunicación explícita de que los slots son teóricos y todavía no representan reservas;
- OpenAPI actualizado a `0.3.0` con los cuatro contratos públicos;
- TypeScript, ESLint, build de producción, compilación Java y validación sintáctica OpenAPI satisfactorios;
- cuatro pruebas unitarias de cálculo horario, cierres, precio especial y visibilidad pública
  aprobadas sin fallos;

Para aplicar `V9` y probar el flujo completo es necesario reiniciar el backend que se ejecuta desde
VS Code. La validación visual a 360 px y el E2E sobre datos publicados quedan como último control de
cierre. El problema conocido de `testCompile` continúa afectando el ciclo Maven completo; la prueba
nueva se compiló con un classpath corto aislado y se ejecutó satisfactoriamente con Surefire.

El script `scripts/validate-iteration-3.ps1` comprueba en un solo paso salud, página pública,
catálogos y sedes sin token, protección de API privada, CORS y migraciones `V8`/`V9`/`V10`.

## 12. Criterio de cierre

La iteración termina cuando dos organizaciones pueden configurar sedes, canchas y horarios independientes; ningún usuario de una puede consultar o modificar la configuración privada de la otra; y el catálogo público solo muestra recursos publicados.

## 13. Deuda explícita que no bloquea

- fotografías reales y almacenamiento de objetos;
- geocodificación automática;
- administración de catálogos desde interfaz (en esta fase son catálogos versionados del producto);
- promociones avanzadas;
- disponibilidad descontando reservas;
- caché de búsqueda pública.
