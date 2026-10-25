# 26. Reglas de partidos, cupos y reputación

## Estados del partido

```text
DRAFT → PUBLISHED → MINIMUM_REACHED → CONFIRMED → IN_PROGRESS → COMPLETED
              └────────────→ CANCELLED
PUBLISHED/MINIMUM_REACHED/CONFIRMED → RESCHEDULED
```

## Reglas de creación

| ID | Regla |
|---|---|
| MAT-001 | Capitán autenticado y activo |
| MAT-002 | Fecha futura y duración válida |
| MAT-003 | `max_players >= min_players > 0` |
| MAT-004 | Costo no negativo y moneda PEN inicialmente |
| MAT-005 | Debe indicar ubicación confirmada o estado “por confirmar” |
| MAT-006 | Política de cancelación visible antes de unirse |
| MAT-007 | Visibilidad: público o privado |
| MAT-008 | Jugador activo con correo verificado y `MATCH_ORGANIZER` autoactivado |

## Visibilidad e invitaciones

- `PUBLIC`: se indexa en Buscar partido y cualquier jugador elegible puede solicitar un cupo;
- `LINK`: no se indexa; tener el enlace permite descubrirlo, pero no se considera un secreto fuerte;
- `PRIVATE`: solo organizador e invitados vigentes pueden consultar sus datos o solicitar un cupo;
- una invitación tiene destinatario, estado, creador, fecha de creación y vencimiento;
- la aceptación exige sesión con correo verificado igual al correo invitado;
- el organizador puede revocar una invitación no consumida;
- una invitación aceptada habilita consulta, inscripción y pago, pero no administración;
- aceptar una invitación no omite disponibilidad, pago, estado ni reglas de participación;
- compartir un enlace nunca concede permisos de administración;
- el organizador solo administra los partidos que creó.

## Cupos

- una persona ocupa máximo un cupo activo por partido;
- `Yo también juego` inicia activo, pero el organizador puede desactivarlo antes de publicar;
- cuando participa, el organizador cuenta exactamente una vez dentro del máximo y su cupo no se
  duplica al pagar;
- el organizador participante asume la misma cuota individual, puede pagarla desde su publicación y
  aparece en recaudación y deuda pendiente;
- la fila financiera del organizador está protegida frente a retiro y declaración de pago directo;
- alcanzar máximo impide confirmación adicional;
- solicitudes simultáneas se resuelven transaccionalmente;
- eliminar a un participante exige motivo y notificación;
- el capitán no puede alterar historial de asistencia después del periodo de corrección sin permiso especial.

### Personas agregadas por el organizador

- el organizador puede ocupar un cupo con una persona que confirmó y pagó fuera de la plataforma;
- el registro manual exige nombre y admite un teléfono privado opcional;
- el organizador declara el pago como pendiente o pagado directamente y puede corregir ese estado
  después; esta declaración queda auditada, no crea ni suplanta una transacción del proveedor de pagos;
- el cupo manual cuenta para la capacidad máxima y se crea bajo bloqueo transaccional del partido;
- solo quien creó el partido puede agregar, actualizar el pago o retirar estos registros;
- al retirar un cupo se promueve a la primera persona en espera, si existe;
- un pago confirmado por la web conserva su trazabilidad y no puede convertirse en pago directo ni
  eliminarse desde este control operativo;
- el nombre puede aparecer en la pizarra del partido, pero el teléfono nunca se publica;
- las altas y bajas quedan auditadas;
- un jugador con cuenta continúa usando la inscripción y el pago normales.

## Lista de espera

- orden estable por fecha/criterio publicado;
- un usuario no está confirmado y en espera simultáneamente;
- promoción reserva temporalmente el cupo;
- vencimiento/rechazo avanza al siguiente;
- capitán no puede cobrar a una persona sin cupo confirmado;
- cambios manuales de prioridad se restringen y auditan.

## Confirmación del partido

Condiciones iniciales:

- mínimo de participantes confirmado;
- ubicación/cancha confirmada o excepción explícita;
- costo final visible;
- no existe bloqueo operativo o moderación;
- capitán confirma ejecución.

La confirmación automática se evaluará después del piloto.

## Cancelaciones del jugador

- se registra instante y motivo opcional controlado;
- antes del límite: sale y activa reemplazo;
- tardía: puede afectar índice de cumplimiento;
- emergencia/causa válida puede ser revisada;
- no se publica el motivo personal a otros jugadores.

## Reputación

El MVP mide cumplimiento, no habilidad deportiva.

Componentes posibles:

- partidos confirmados;
- asistencias;
- cancelaciones oportunas;
- cancelaciones tardías;
- ausencias;
- reportes confirmados;
- antigüedad y verificación.

### Principios

- explicar qué se mide;
- no mostrar una puntuación sin suficiente actividad;
- permitir revisión/corrección;
- evitar sesgos por nivel, género, zona o capacidad económica;
- no publicar sanciones sensibles;
- reducir peso de eventos antiguos;
- separar acusación de reporte confirmado.

### Fórmula

No definir una puntuación definitiva antes de obtener datos. Para piloto, mostrar señales simples:

```text
Identidad verificada
N partidos completados
Asistencia reciente: alta/media/baja, con muestra mínima
```

## Reportes y conducta

- categorías controladas: ausencia, agresión, discriminación, fraude, suplantación, spam, otro;
- evidencia opcional protegida;
- reporte no cambia reputación hasta revisión;
- reincidencia y gravedad determinan medidas;
- suspensión impide crear/unirse según alcance;
- existe mecanismo de apelación proporcional.

## Privacidad del partido

- público: nombre visible limitado, no teléfono;
- los enlaces usan identificadores aleatorios; compartirlos permite solicitar inscripción;
- privado: no indexado en Explorar; una persona autenticada con el enlace puede acceder (decisión del producto y MatchAccessPolicyTest). No ofrece confidencialidad basada en invitación exclusiva;
- ubicación exacta puede mostrarse solo a confirmados cuando la seguridad lo justifique;
- lista de participantes respeta configuración y minimización.

## Compatibilidad del pase de ingreso

La emisión, regeneración y consumo del QR conservan instantes UTC. Los parámetros JDBC de issued_at, valid_until y consumed_at se enlazan como Timestamp, igual que en los pases de reservas; no se envía Instant directamente al controlador PostgreSQL. El pase continúa vinculado al participante confirmado y solo el organizador del partido registra el ingreso.

## Ventana del QR de ingreso

El pase se habilita a las 00:00 de la fecha de inicio del partido en America/Lima y vence exactamente en ends_at, sin las cuatro horas de tolerancia anteriores. Antes de esa fecha la interfaz informa cuándo estará disponible; al terminar retira el QR y sus acciones aunque el popup siga abierto. Backend valida la ventana al emitir, regenerar, previsualizar y registrar el ingreso, también para pases anteriores. Partidos cancelados no admiten validación. Se conservan propiedad del pase, cupo confirmado y alcance exclusivo del organizador.
