# Análisis de requerimientos importados

**Fuente:** `docs/Requerimientos.docx`  
**Fecha de revisión:** 2026-09-04  
**Decisión:** incorporar únicamente capacidades reutilizables que mejoran el producto, sin cambiar el
stack, duplicar requisitos ni convertir Pulso Piura en software a medida.

## 1. Conclusión ejecutiva

El documento externo es consistente con la visión general, pero mezcla requisitos ya aprobados,
mejoras válidas, funciones posteriores al MVP y decisiones comerciales todavía no validadas. No se
adopta como especificación directa.

Se incorporan al roadmap:

- catálogo controlado de modalidades, superficies y amenidades;
- reservas recurrentes con serie, excepciones y detección de conflictos;
- pase digital con QR no sensible para check-in;
- reglas explícitas de quórum para partidos abiertos;
- historial unificado y reportes financieros/operativos exportables;
- promociones configurables por horario y cupones;
- sincronización opcional con Google Calendar;
- estadísticas ampliadas para torneos;
- CRM derivado y transparente, sujeto a consentimiento;
- comercios aliados y pauta medible como línea futura separada.

No se adoptan precios comerciales, marcas, locales, segmentos automáticos ni porcentajes de
descuento definidos en el Word, porque carecen de validación. Tampoco se añade chat en tiempo real al
MVP: el enlace compartible, las notificaciones y la coordinación estructurada cubren primero el
problema con menor riesgo y complejidad.

## 2. Matriz de comparación y decisión

| Tema del Word | Cobertura actual | Decisión | Fase |
|---|---|---|---|
| Deportes, modalidades y capacidad | Ya existe sede/cancha, deporte, modalidad y capacidad | Mantener y ampliar catálogos controlados | Iteración 3 |
| Superficie y cancha techada | Existe `surfaceType` e `indoor` | Formalizar catálogo; evitar texto libre progresivamente | Iteración 3 |
| Iluminación, vestuarios, duchas, estacionamiento e implementos | No modelado todavía | Incorporar como amenidades configurables reutilizables | Iteración 3 |
| Precio diurno/nocturno, días hábiles y fin de semana | Cubierto por reglas semanales y excepciones | No duplicar; feriados usarán excepciones/calendario | Iteración 3 |
| Matriz visual de disponibilidad | Prevista como catálogo y slots teóricos | Incorporar semántica accesible además de colores | Iteraciones 3 y 4 |
| HOLD de diez minutos | Ya definido como hipótesis `RES-013` | Mantener configurable; no fijar diez minutos globalmente | Iteración 4 |
| Pago total o adelanto | Ya definido en reservas y pagos | Mantener | Iteraciones 4 y 6 |
| Reserva recurrente fija | No estaba formalizada como historia | Incorporar con serie y excepciones, después de reserva simple | Iteración 4B |
| Ticket y QR de reserva | No estaba formalizado | Incorporar pase firmado/opaco para check-in; sin datos sensibles | Iteración 4B |
| Partido abierto y pago por cupo | Núcleo del producto; pagos divididos ya en evolución | Mantener; pago individual se activa tras validar proveedor/operación | Iteraciones 5 y 6 |
| Barra de cupos | Ya aparece en diseño y reglas | Mantener, sin requisito nuevo | Iteración 5 |
| Quórum, plazo y cancelación automática | Confirmación mínima existe, automatización estaba pendiente | Incorporar reglas configurables y proceso idempotente | Iteración 5B |
| Lista visible de jugadores, nivel y posición | Perfil y privacidad ya contemplados | Mostrar solo datos mínimos y según visibilidad/consentimiento | Iteración 5 |
| Chat entre jugadores | No contemplado | Postergar; usar detalles estructurados y enlaces/notificaciones | Posterior a beta |
| Torneos, equipos, fixture, resultados y tabla | Ya documentado | Mantener sin duplicar | Iteración 7 condicionada |
| Goleadores y tarjetas | Parcialmente cubierto por resultados/sanciones | Incorporar como extensión posterior del torneo básico | Iteración 7B |
| Historial de reservas | Implícito en reservas | Formalizar vista para jugador y organización | Iteración 4B |
| Caja, ingresos y desglose por medio | Reportes mínimos existentes, no contabilidad completa | Incorporar libro operativo y conciliación; no reemplaza contabilidad | Iteración 6B |
| Ocupación, rentabilidad y demanda | Ya previsto en reportes | Mantener y precisar métricas | Iteración 6B |
| Exportación imprimible/hoja de cálculo | Prevista de forma general | Incorporar exportación autorizada y auditada | Iteración 6B |
| Directorio de clientes | Perfiles y reservas ya generan relación | Crear vista derivada por tenant; no duplicar datos personales | Iteración 8 |
| VIP, regular e inactivo | Nuevo, pero denominado incorrectamente “inteligente” | Evaluar reglas transparentes, configurables y explicables | Iteración 8 |
| Reactivación, cumpleaños y descuentos automáticos | Notificaciones existen; cumpleaños no es dato necesario | Postergar; exigir consentimiento de marketing y minimizar datos | Posterior a beta |
| Cupones y happy hour | Horas valle existen sin motor de cupones | Incorporar promociones simples después del núcleo de pagos | Iteración 6B |
| Cartelera de eventos | No contemplada | Añadir como oportunidad P2, separada de torneos | Iteración 8 |
| Tarjeta, efectivo, Yape, Plin y transferencias | Arquitectura de pagos ya desacoplada | Mantener métodos habilitados por proveedor/organización | Iteración 6 |
| Google Calendar | No contemplado explícitamente | Incorporar integración opcional, revocable y asíncrona | Iteración 8 |
| Comercios aliados y enlaces a Instagram | Nuevo | Incorporar solo después de validar demanda y seguridad comercial | Iteración 9 |
| Planes y tarifas S/ 220, S/ 280 y S/ 350 | Decisión comercial sin evidencia | No incorporar como requisito; validar disposición de pago | Validación comercial |
| Recomendación por cercanía | Requiere geodatos confiables | Postergar y evitar seguimiento preciso del jugador | Iteración 9 |
| Clics, CTR, vigencia y cobro de pauta | Nuevo y medible | Incorporar con analítica minimizada y panel separado | Iteración 9 |

## 3. Requisitos aceptados y ajustados

### 3.1 Espacios deportivos

- modalidades iniciales controladas por deporte;
- catálogo de superficies;
- amenidades de sede y cancha con códigos estables;
- texto público limitado para aclaraciones;
- filtros públicos por deporte, modalidad, superficie y amenidades.

### 3.2 Reservas avanzadas

- reserva recurrente crea una serie identificable;
- cada ocurrencia valida disponibilidad y precio;
- un conflicto no puede sobrescribirse silenciosamente;
- cancelar o modificar permite elegir una ocurrencia o futuras ocurrencias;
- el pase QR contiene un identificador opaco, expira y no confirma pagos por sí mismo;
- el check-in se autoriza por organización y queda auditado.

### 3.3 Partidos abiertos

- `minimumPlayers`, `maximumPlayers`, `confirmationDeadline` y política de quórum explícitos;
- confirmación/cancelación automática idempotente, cuando se habilite;
- devolución, crédito o reprogramación dependen de la política y del pago confirmado;
- los participantes ven nombre público, nivel y posición solo dentro de las reglas de privacidad;
- no se publica teléfono ni información de pago.

### 3.4 Operación, finanzas y promociones

- historial de reservas por usuario y por organización;
- métricas de ocupación, ingreso bruto operativo y demanda por franja;
- desglose por estado y método de pago;
- exportación CSV/XLSX/PDF autorizada, limitada y auditada;
- cupones de monto o porcentaje con vigencia, límites de uso y alcance;
- precio de horario valle reutiliza las reglas de disponibilidad, no un segundo motor de tarifas;
- los reportes no se presentan como contabilidad oficial ni calculan impuestos sin alcance aprobado.

### 3.5 CRM y comunicaciones

- el directorio se deriva de interacciones reales con la organización;
- no se crea una copia independiente del perfil global;
- segmentación basada en reglas visibles y corregibles, no inferencias opacas;
- marketing requiere consentimiento, finalidad, opt-out y límites de frecuencia;
- no se recopila fecha de nacimiento solo para enviar promociones en el MVP.

### 3.6 Calendario

- exportación estándar `.ics` como primera opción de bajo acoplamiento;
- Google Calendar mediante OAuth delegado solo si el usuario lo solicita;
- tokens cifrados, alcance mínimo, revocación y sincronización idempotente;
- el calendario nunca se considera fuente de verdad de una reserva.

### 3.7 Comercios aliados

- módulo separado de reservas y pagos deportivos;
- campaña, plan, vigencia, ubicaciones elegibles, creatividad, beneficio y URL permitida;
- redirección externa segura con `noopener noreferrer`;
- clics agregados con prevención básica de abuso y sin perfilado individual innecesario;
- estado de cobro publicitario separado de los pagos de reservas;
- no promover alcohol a menores ni asumir que todos los usuarios desean recomendaciones;
- precios, comercios de ejemplo y posiciones garantizadas quedan fuera del requisito técnico.

## 4. Requisitos no incorporados

1. **Marca Pulso Club.** El documento no reemplaza la decisión pendiente de marca del producto.
2. **Importes en dólares.** La moneda inicial oficial continúa siendo PEN.
3. **Tarifas publicitarias fijas.** Son hipótesis comerciales, no reglas del software.
4. **Chat en tiempo real dentro del MVP.** Su moderación, privacidad y coste no compensan todavía el valor.
5. **Segmentación “inteligente” automática.** Solo se admitirán reglas transparentes y consentidas.
6. **Cumpleaños como dato obligatorio.** No cumple minimización para el alcance actual.
7. **Reembolso inmediato garantizado.** Depende del método, proveedor y conciliación; se conserva una máquina de estados.
8. **La captura o QR como prueba de pago.** La confirmación sigue requiriendo proveedor autenticado o conciliación autorizada.

## 5. Riesgos y condiciones

| Riesgo | Tratamiento |
|---|---|
| Crecimiento excesivo del MVP | Reservas recurrentes, CRM, promociones y publicidad quedan en subfases posteriores |
| Duplicación de datos personales | Vistas derivadas y referencias a perfil/actividad, no nuevas copias |
| Mensajería comercial no consentida | Consentimiento por finalidad, opt-out y límites de frecuencia |
| QR reutilizado o filtrado | Token opaco, expiración, estado y validación servidor a servidor |
| Reportes interpretados como contabilidad | Alcance operativo visible y exportaciones auditadas |
| Publicidad inadecuada | Políticas de categoría, edad, contenido y revisión manual |
| Integraciones externas frágiles | Puertos/adaptadores, outbox, reintentos idempotentes y revocación |

## 6. Orden de incorporación

1. Terminar Iteración 3 con amenidades y filtros previstos en el modelo/UI.
2. Construir reserva simple y después la extensión 4B para recurrencia, historial y QR.
3. Construir partidos/cupos y después automatizar quórum en 5B.
4. Implementar pagos y notificaciones; añadir reportes y promociones simples en 6B.
5. Mantener torneo básico condicionado; estadísticas deportivas avanzadas pasan a 7B.
6. Evaluar CRM, eventos y Calendar en beta, con consentimiento y evidencia.
7. Validar comercialmente comercios aliados antes de iniciar Iteración 9.

Este orden protege el objetivo principal: completar partidos y operar reservas seguras antes de
añadir capacidades de fidelización o monetización secundaria.
