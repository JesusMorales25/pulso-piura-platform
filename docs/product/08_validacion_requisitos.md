# 8. Validación de requisitos adicionales

## Objetivo de la encuesta

La encuesta ya no decidirá si “hacemos o no una aplicación”. El proyecto tiene una visión definida. Su función será:

- confirmar la prioridad de problemas;
- descubrir requisitos recurrentes no contemplados;
- entender reglas operativas;
- identificar restricciones de seguridad, pagos y privacidad;
- reclutar participantes para entrevistas y piloto.

## Lo que la encuesta no hará

- prometer funciones;
- diseñar un sistema diferente para cada complejo;
- pedir especificaciones técnicas al usuario;
- tratar cada preferencia como requisito obligatorio;
- reemplazar entrevistas y observación.

## Bloques de preguntas

### Jugadores y capitanes — máximo 15 preguntas

1. Rol y deportes.
2. Zona y frecuencia reciente.
3. Cómo se organizó el último partido.
4. Problemas ocurridos en los últimos 30 días.
5. Qué ocurre cuando faltan personas.
6. Cómo se pagan los cupos.
7. Condiciones para pagar anticipadamente.
8. Información necesaria antes de unirse.
9. Reglas de cancelación consideradas justas.
10. Disposición a jugar con personas verificadas.
11. Funciones que priorizaría.
12. Problema adicional no contemplado.
13. Canal preferido de notificación.
14. Participación en entrevista/piloto.
15. Fuente de la encuesta.

### Complejos — máximo 15 preguntas

1. Zona, cantidad de espacios y deportes.
2. Canal principal de reservas.
3. Volumen aproximado.
4. Problemas del último mes.
5. Horas con menor ocupación.
6. Control de adelantos y saldos.
7. Política de cancelación actual.
8. Datos mínimos necesarios del cliente.
9. Roles del personal que usaría el panel.
10. Reportes prioritarios.
11. Apertura a partidos abiertos.
12. Requisito operativo no contemplado.
13. Modelo comercial preferido.
14. Condiciones para piloto.
15. Contacto opcional.

### Organizadores — máximo 15 preguntas

1. Rol, evento y deportes.
2. Fecha y tamaño del último evento.
3. Herramientas actuales.
4. Problemas experimentados.
5. Proceso de inscripción y validación.
6. Pagos y devoluciones.
7. Fixture y cambios.
8. Resultados, sanciones y reclamos.
9. Información pública necesaria.
10. Roles organizativos.
11. Funciones prioritarias.
12. Requisito adicional.
13. Próximo evento.
14. Disposición a piloto.
15. Contacto opcional.

## Registro de requisitos descubiertos

| Campo | Descripción |
|---|---|
| ID | `DISC-###` |
| Fuente | encuesta, entrevista, piloto o soporte |
| Actor | jugador, capitán, complejo u organizador |
| Problema | situación observable |
| Solicitud | solución sugerida por el usuario |
| Frecuencia | cantidad de fuentes independientes |
| Impacto | bajo, medio, alto o crítico |
| Alineación | relación con la visión |
| Decisión | evaluar, validar, aceptar, postergar o descartar |
| Requisito relacionado | RF/RNF existente o nuevo |

## Regla de incorporación

Un requisito adicional entra al backlog cuando:

1. aparece en varias fuentes independientes o resuelve un riesgo crítico;
2. está expresado como problema y no solo como solución pedida;
3. beneficia a un segmento reutilizable;
4. tiene criterio de aceptación verificable;
5. no contradice seguridad, privacidad o estrategia;
6. recibe prioridad formal del responsable de producto.

