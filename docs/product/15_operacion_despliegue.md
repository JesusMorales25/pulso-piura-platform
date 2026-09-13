# 15. Despliegue, observabilidad y continuidad

## Ambientes

| Ambiente | Datos | Uso |
|---|---|---|
| Local | ficticios | desarrollo |
| Test CI | efímeros | pruebas automáticas |
| Staging | sintéticos | validación y migraciones |
| Producción | reales | operación |

No copiar datos personales de producción hacia ambientes inferiores.

## Despliegue

- imágenes Docker inmutables;
- infraestructura declarativa cuando el proyecto lo justifique;
- secretos desde un gestor seguro;
- migraciones Flyway antes o durante despliegue controlado;
- health checks de vida y disponibilidad;
- despliegue gradual o blue/green cuando aumente el tráfico;
- rollback de aplicación y plan de recuperación de esquema.

## Observabilidad

### Logs

- JSON estructurado;
- correlation ID;
- actor seudonimizado cuando sea suficiente;
- tenant ID controlado;
- acción, resultado, latencia y error;
- nunca tokens, OTP, credenciales o capturas completas.

### Métricas técnicas

- tasa de solicitudes y errores;
- latencia p50/p95/p99;
- conexiones de base;
- saturación de pools;
- cola de notificaciones;
- fallos de login/OTP;
- webhooks rechazados;
- conflictos de reserva.

### Métricas de producto

- partidos publicados/completados;
- cobertura y tiempo de cupos;
- conversión a confirmación/pago;
- cancelación tardía;
- repetición de capitanes;
- ocupación generada por complejo;
- torneos activos.

## Alertas iniciales

- error 5xx sostenido;
- latencia p95 fuera de objetivo;
- base sin conexiones disponibles;
- aumento anormal de 401/403/OTP;
- fallo de webhook o notificación;
- backup fallido;
- certificado próximo a vencer;
- acción administrativa anómala.

## Continuidad

Objetivos iniciales por validar:

- disponibilidad mensual: 99,5%;
- RPO: máximo 24 horas en beta, reducir antes de pagos automatizados;
- RTO: máximo 8 horas en beta, reducir según adopción;
- backup diario y retención definida;
- restauración probada trimestralmente;
- procedimiento manual temporal para reservas durante una caída.

## Gestión de incidentes

1. detectar y clasificar;
2. contener;
3. preservar evidencia;
4. recuperar;
5. comunicar según impacto y obligaciones;
6. analizar causa raíz;
7. registrar acciones correctivas.

## Privacidad operacional

El nuevo Reglamento peruano de Protección de Datos Personales refuerza la responsabilidad proactiva. Antes de producción se documentarán:

- inventario y finalidades;
- base de legitimación/consentimientos;
- encargados y transferencias;
- conservación y eliminación;
- atención de derechos;
- gestión de incidentes;
- evaluación de riesgos para tratamientos sensibles.

