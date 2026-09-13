# 24. Flujos UX por actor

## Flujo A — Visitante encuentra y se une a un partido

```text
Explorar → Filtrar → Ver detalle → Unirse
→ Continuar con Google → Completar perfil mínimo
→ Confirmar reglas/costo → Cupo confirmado o lista de espera
```

Datos visibles antes del login:

- deporte, modalidad y nivel;
- fecha, hora y zona aproximada;
- costo por persona;
- cupos disponibles;
- organizador verificado/indicadores permitidos;
- reglas y política de cancelación;
- no mostrar teléfonos ni lista completa de personas.

## Flujo B — Capitán crea un partido

1. Selecciona deporte y modalidad.
2. Define fecha/hora, duración y zona.
3. Elige cancha/reserva existente o “por confirmar”.
4. Define mínimo, máximo y costo por jugador.
5. Define nivel, visibilidad y reglas.
6. Revisa resumen.
7. Publica y recibe enlace para WhatsApp.
8. Administra confirmados, pendientes y espera.

La plataforma debe guardar borrador para evitar perder datos.

## Flujo C — Complejo configura oferta

```text
Crear organización → Verificación operativa
→ Crear sede → Crear cancha
→ Definir deporte/modalidad/capacidad
→ Configurar horarios y precios
→ Revisar vista pública → Publicar
```

Los cambios que afecten reservas existentes deben advertir impacto antes de confirmarse.

## Flujo D — Usuario reserva una cancha

```text
Complejo → Cancha → Fecha → Horario
→ Resumen de precio/política → Crear HOLD
→ Registrar/confirmar adelanto → Reserva confirmada
→ Recordatorios → Completar o cancelar
```

El usuario debe conocer duración del HOLD y qué ocurre si vence.

## Flujo E — Operador gestiona reserva manual

1. Busca cliente o crea registro mínimo autorizado.
2. Selecciona cancha y horario.
3. Visualiza conflictos.
4. Registra canal, precio, adelanto y referencia.
5. Confirma según permiso.
6. El cliente recibe confirmación.
7. La acción queda auditada.

## Flujo F — Reemplazo desde lista de espera

```text
Jugador cancela → Política calcula consecuencia
→ Se libera cupo → Se promueve siguiente
→ Se notifica con plazo de aceptación
→ Acepta: confirmado
→ Vence/rechaza: se ofrece al siguiente
```

Para el piloto, la promoción puede requerir confirmación del capitán. La automatización total se valida posteriormente.

## Flujo G — Organizador crea torneo

```text
Datos del torneo → Modalidad/reglas → Cupos y costo
→ Sedes/fechas → Publicar inscripción
→ Registrar equipos/plantillas → Cerrar inscripción
→ Generar/revisar fixture → Publicar
→ Resultados/aprobación → Tabla → Cierre
```

## Puntos de confianza

### Solicitud de capacidades

Desde el perfil autenticado, la persona puede solicitar organizar partidos abiertos o publicar un
complejo. La plataforma muestra el estado de la solicitud y revisa la información antes de habilitar
las herramientas de gestión. La solicitud no concede permisos ni confirma una licencia
automáticamente.

La interfaz debe explicar:

- quién organiza;
- qué está confirmado y qué está pendiente;
- cuánto se paga y a quién;
- política de cancelación;
- tratamiento de datos;
- canal de soporte;
- consecuencias de ausencia;
- diferencias entre verificado, pagado y asistió.

## Métricas UX

- tiempo para encontrar actividad;
- conversión detalle → intento de unirse;
- abandono en login/onboarding;
- tiempo para publicar partido;
- errores de disponibilidad;
- cancelaciones por información incompleta;
- tareas completadas sin soporte.

