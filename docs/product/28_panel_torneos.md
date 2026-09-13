# 28. Panel de torneos

## Objetivo

Reducir trabajo manual de inscripción, fixture, resultados y comunicación manteniendo control del organizador.

## Secciones

```text
Resumen
Configuración
Equipos
Jugadores
Inscripciones/pagos
Fixture
Resultados
Tabla
Sanciones
Comunicaciones
Publicación
```

## Ciclo del torneo

```text
DRAFT → REGISTRATION_OPEN → REGISTRATION_CLOSED
→ SCHEDULED → IN_PROGRESS → COMPLETED → ARCHIVED
```

Cancelación es un estado excepcional con procedimiento propio.

## Configuración

- deporte/modalidad;
- formato de competencia;
- categorías;
- mínimo/máximo de equipos;
- fechas y sedes;
- costo y política;
- reglamento versionado;
- responsables y roles.

Cambiar reglas después de abrir inscripciones exige nueva versión y comunicación.

## Equipos y plantillas

- delegado responsable;
- nombre y distintivo;
- estado de inscripción;
- plantilla y dorsales;
- validación de duplicados;
- cierre de plantilla configurable;
- historial de altas/bajas.

## Fixture

MVP:

- generación asistida o carga manual estructurada;
- edición antes de publicar;
- validación de horarios/canchas;
- detección de equipo duplicado en la misma franja;
- publicación de versión.

No prometer optimización automática compleja inicialmente.

## Resultados

```text
SCHEDULED → IN_PROGRESS → RESULT_REPORTED → RESULT_APPROVED
```

- árbitro/mesa registra;
- organizador aprueba;
- corrección posterior requiere motivo y auditoría;
- tabla utiliza solo resultados aprobados;
- walkover/suspensión tienen códigos explícitos.

## Sanciones y reclamos

- catálogo de tipos;
- entidad afectada;
- evidencia protegida;
- vigencia/fechas;
- responsable y decisión;
- apelación cuando corresponda;
- no publicar información personal innecesaria.

## Vista pública

- información del torneo;
- equipos confirmados;
- fixture;
- resultados aprobados;
- tabla;
- reglas vigentes;
- contacto/soporte del organizador.

No publicar pagos, teléfonos, reportes o deliberaciones.

## Roles

| Rol | Capacidades |
|---|---|
| Organizador | configuración y aprobación |
| Mesa de control | programación/resultados asignados |
| Árbitro | resultado e incidencias de su encuentro |
| Delegado | equipo y plantilla propios |
| Tesorería | estado de inscripción/pago |
| Comunicaciones | publicación sin modificar resultados |

## Condición de entrada al MVP

Este módulo entra en P1 solo si encuesta/piloto confirma al menos tres organizadores con evento próximo y necesidad operativa reutilizable.

