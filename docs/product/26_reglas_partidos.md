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
| MAT-007 | Visibilidad: público, enlace o privado |

## Cupos

- una persona ocupa máximo un cupo activo por partido;
- el capitán puede contar o no dentro del máximo según modalidad, definido explícitamente;
- alcanzar máximo impide confirmación adicional;
- solicitudes simultáneas se resuelven transaccionalmente;
- eliminar a un participante exige motivo y notificación;
- el capitán no puede alterar historial de asistencia después del periodo de corrección sin permiso especial.

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
- enlace: no indexado, pero no se considera secreto fuerte;
- privado: acceso por invitación/autorización;
- ubicación exacta puede mostrarse solo a confirmados cuando la seguridad lo justifique;
- lista de participantes respeta configuración y minimización.

