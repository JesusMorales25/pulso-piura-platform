# Pagos externos y comprobantes privados

## Alcance aprobado

El jugador transfiere por Yape o Plin al receptor indicado. Adjuntar una imagen crea una revisión;
no confirma un ingreso bancario. El receptor contrasta sus movimientos y decide. La inscripción
al partido y el alquiler de la cancha son obligaciones distintas con destinatarios distintos.

El mismo usuario puede ser pagador en una operación y revisor en otra. Los permisos se derivan
del partido/complejo concreto, no de un rol global enviado por el navegador. Un dueño de otro
complejo, otro organizador y otros jugadores no pueden abrir el comprobante. El pagador sí puede
ver su evidencia e historial. No hay acceso implícito del administrador global a las imágenes.

## Plan de implementación y verificación

1. Puerto PaymentProofStorage y adaptador de filesystem privado: recodificar JPG/PNG a PNG,
   limitar bytes/dimensiones y bloquear rutas arbitrarias. Pruebas de archivos válidos/inválidos.
2. Migración V36 y servicios de destino, entrega, revisión y auditoría. Integración con bloqueos
   y saldos de reservas/partidos; pruebas de autorización, transiciones e idempotencia.
3. Panel reutilizable de destino, envío y revisión en inscripción/reserva, organizador y dueño.
   Lectura autenticada mediante blob temporal; no URL pública permanente. Formularios accesibles.
4. Configuración de volumen Docker, modo separado, documentación/API e índice. Compilación,
   pruebas Java/frontend y comprobaciones locales de migración cuando haya PostgreSQL disponible.

## Configuración

Variables exclusivas del backend:

| Variable | Valor de ejemplo | Efecto |
|---|---|---|
| PAYMENTS_MODE | external_manual | Registro externo y revisión; simulation/disabled siguen disponibles |
| PAYMENT_PROOF_DIRECTORY | /srv/pulso/private/payment-proofs | Ruta absoluta dentro del volumen privado |
| EXTERNAL_PAYMENT_REVIEW_MINUTES | 30 | Retención limitada para revisión, nunca posterior al inicio |
| PAYMENT_PROOF_RETENTION_DAYS | 90 | Plazo técnico configurable para evidencias terminales, sujeto a política del responsable |

En desarrollo el directorio predeterminado es `.local/payment-proofs` relativo al proceso Java.
Se excluye de Git y del índice. No usar una carpeta pública, sincronizada o temporal. En Windows
restringir ACL a la cuenta que ejecuta Java; los permisos POSIX se aplican donde estén disponibles.

El archivo original se limita a 5 MiB; la imagen normalizada también. Dimensiones máximas de 6000
píxeles por lado y 8 megapíxeles. Solo JPG/PNG; no PDF, SVG ni archivos animados. Metadatos y nombre
original no se conservan. El archivo final recibe UUID aleatorio. SHA-256 ayuda a señalar duplicados,
sin constituir prueba bancaria ni impedir por sí solo fraude con imágenes modificadas.

## Persistencia y despliegue

`deploy/vps/compose.auth0.yaml` contiene PostgreSQL privado, backend y Caddy HTTPS. El frontend
permanece en Vercel y la identidad en Auth0. Copiar `.env.example` a `.env.production`, completar
valores reales fuera de Git y crear DNS del dominio de API hacia el VPS. No se instala Keycloak.

```
docker compose --env-file deploy/vps/.env.production -f deploy/vps/compose.auth0.yaml up -d --build
```

Activar external_manual solo después de aplicar migraciones y verificar almacenamiento persistente.
El volumen `payment_proofs` se monta en la misma ruta del backend. El contenedor ejecuta UID 10001;
la imagen prepara esa carpeta con propietario y permisos restringidos. Para volúmenes ya existentes
o bind mounts, comprobar propietario/ACL manualmente. No usar `down -v`: elimina datos persistentes.
Los manifests Oracle/Coolify también incluyen el volumen; conservan su proveedor OIDC previo.

En Vercel solo cambia NEXT_PUBLIC_API_BASE_URL si se migra la API. Actualizar WEB_ALLOWED_ORIGIN en
backend y las URLs autorizadas de Auth0 cuando corresponda. No poner rutas privadas ni secretos
en NEXT_PUBLIC. Este cambio no modifica ni despliega los servicios actuales de Render/Vercel.

Render gratuito tiene disco efímero: mantener simulation/disabled allí. Para adjuntos reales se
necesita disco persistente contratado o VPS con volumen. El adaptador S3 queda como evolución.

## Operación

Configurar titular, teléfono y métodos habilitados desde el partido/complejo antes de aceptar pagos.
El dueño dispone de configuración general en Reservas incluso si todavía no tiene reservas.
El organizador configura el destino en la administración de su partido. No se necesita subir QR:
esta primera versión permite transferir al número indicado en la cuenta configurada.
El pagador prepara el pago antes de ver instrucciones de transferencia. El servidor calcula
el importe y retiene inicialmente el cupo del partido por cinco minutos, sin superar su inicio.
Para una reserva verifica su retención vigente. Al enviar una imagen dentro de ese plazo, la
retención pasa al plazo de revisión configurado. Una captura posterior al vencimiento no recupera
un cupo y requiere atención del receptor; no repetir la transferencia por el error.
La solicitud conserva el destino que se mostró al enviar la evidencia. Ningún cambio posterior
de cuenta puede redirigir una solicitud ya enviada. Publicar condiciones y atención antes del piloto.
La entrega incluye la versión del destino mostrado; si cambió mientras se transfería, se rechaza
el envío con indicación de contactar al receptor y no volver a pagar. El piloto no dispone todavía
de una mesa de disputas: esa excepción requiere atención directa del receptor.

Mientras se revisa, el importe no se suma a recibido. No reenviar por WhatsApp comprobantes de otros
usuarios. Revisar movimientos de la cuenta receptora; nunca solicitar contraseña, OTP ni acceso
a la aplicación bancaria. Una referencia o fotografía puede falsificarse.

Cuando vence una retención, no volver a solicitar pago hasta aclarar el movimiento externo previo.
Una revisión tardía o conflicto requiere contacto entre pagador y receptor para reubicación o
devolución fuera de la app. No hay transferencia ni devolución bancaria automática. No borrar
el movimiento confirmado para corregirlo; conservar trazabilidad.

## Respaldo y restauración

Respaldar PostgreSQL y el volumen privado, cifrados y fuera del VPS. Un backup solo de la base
no contiene las imágenes. Un volumen Docker persistente no constituye un respaldo.
Para una copia consistente, coordinar una ventana de mantenimiento sin envíos ni limpieza,
exportar primero pg_dump y después archivar payment_proofs, cifrar ambos y verificar checksums.
Conservar las claves de cifrado fuera del servidor y probar restauración en un ambiente aislado.
El procedimiento operativo de cifrado, subida externa y alertas debe configurarse en el VPS;
no queda activado por este desarrollo.

## Pendientes comerciales

El responsable debe validar identidad, contacto de privacidad/reclamos, conservación y reglas
para cancelaciones/reembolsos antes de abrir un piloto con dinero real. Los 90 días son un valor
técnico configurable, no una obligación legal declarada. Evitar datos reales mientras falte esa
información. Los saldos de simulación anteriores no acreditan dinero recibido.

## Verificación reproducible

Frontend: `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build`.
Para probar navegador, iniciar una compilación local en 3002 e importar las mismas variables
públicas OIDC de la compilación. Ejecutar `node tests/external-payments.browser.cjs` y
`npm run test:a11y`; usar A11Y_BROWSER_CHANNEL=chrome si se usa Chrome instalado. Son sesiones
y respuestas API sintéticas; el test bloquea destinos remotos y no transfiere dinero.

Backend: `mvn spotless:apply verify`. Para pruebas de persistencia, preparar una base local
aislada cuyo nombre contenga test, definir SPRING_DATASOURCE_URL/USERNAME/PASSWORD y ejecutar
`mvn -DrunExternalDatabaseTests=true verify`. Cuatro pruebas transaccionales generan sus propios
usuarios/complejos/partidos y revierten los registros y archivos. El contexto aplica Flyway y
valida JPA/JPQL; no ejecutar contra producción. Las cinco pruebas de concurrencia existentes se
habilitan con runDatabaseTests=true y necesitan una cancha publicada con dueño activo de prueba.

Se verificaron V35/V36 y los cuatro flujos de dominio en PostgreSQL 18.1 local aislado. Flyway
emitió una advertencia de versión probada hasta PostgreSQL 17; los manifests conservan 17.
La prueba de symlink se omite donde Windows no permite crearlo. Las pruebas locales no acreditan
un pago bancario ni validan infraestructura, backups externos o enrolamiento MFA real de Auth0.

La limpieza terminal no es una mesa de disputas ni un sistema de devoluciones: el cierre de una
incidencia tardía requiere motivo y atención externa, y no afirma que el banco devolvió dinero.
Un fallo abrupto entre escribir el archivo y confirmar la transacción puede dejar un archivo
huérfano; conciliar periódicamente el volumen con los metadatos antes de retirar archivos.
El modo manual no incorpora reautenticación/MFA automática para cambios de cuenta: exigir MFA
de responsables en el proveedor antes del piloto. No alternar modos entre réplicas simultáneas.

### Cierre de verificación — 23 de octubre de 2026

- Backend: 222 pruebas aprobadas, una omitida por permisos de symlink en Windows; incluyen
  cuatro pruebas de persistencia de pagos y cinco pruebas de concurrencia en PostgreSQL aislado.
- Frontend: 32 pruebas aprobadas, compilación, TypeScript, lint y formato verificados.
- Prueba final de navegador: seis flujos de jugador/dueño en 320, 393 y 768 px aprobados, sin
  desbordamientos ni infracciones detectadas por axe. Incluye preparar antes de transferir,
  vencimiento de preparación, conservación del adjunto, revisión e historial.
- La base de desarrollo habitual y producción no se modificaron; las migraciones se ejecutaron
  en una base aislada de prueba. La configuración local está preparada como external_manual;
  reiniciar el backend aplica las migraciones pendientes en su base habitual.

## Integración Supabase Storage (23 de octubre de 2026)

Diseño aprobado: backend como único intermediario, puerto PaymentProofStorage sin cambios y
normalización de imágenes compartida con filesystem. Auth0 sigue autenticando a las personas;
no se agregan sesiones Supabase al navegador ni se habilita la Data API de las tablas app.
Plan: extraer normalización, añadir adaptador HTTP con límites/timeouts y bucket privado,
configurar proveedor, probar almacenamiento y regresiones de pago, documentar puesta en marcha.
Esta ampliación reemplaza la restricción anterior de Render: ahora puede usar almacenamiento
externo privado sin depender de su disco efímero. No se implementa S3.

### Configuración en Supabase

1. Storage > New bucket: ID payment-proofs, Public desactivado, límite 5242880 bytes,
   MIME permitido image/png. El backend convierte JPG/PNG válidos a PNG.
2. No crear políticas que permitan acceso anon/authenticated al bucket. No usar URLs públicas.
3. Settings > API Keys: crear una clave secreta de servidor sb_secret_ para el backend.
   Esta clave tiene privilegios elevados y omite RLS; mantenerla solo en Render como secreto,
   nunca en Vercel/NEXT_PUBLIC, Git, logs o el chat. No es la contraseña de PostgreSQL.
4. El bucket y la clave son configuración externa; no se crean con Flyway ni al arrancar.

### Variables en Render

```dotenv
PAYMENTS_MODE=external_manual
PAYMENT_PROOF_STORAGE=supabase
SUPABASE_STORAGE_URL=https://cwspxfhlarshflihhtsr.supabase.co
SUPABASE_STORAGE_BUCKET=payment-proofs
SUPABASE_STORAGE_SECRET_KEY=<clave sb_secret_ creada en Supabase>
EXTERNAL_PAYMENT_REVIEW_MINUTES=30
PAYMENT_PROOF_RETENTION_DAYS=90
```

No se necesitan nuevas variables en Vercel. El frontend consulta las capacidades de la API y
muestra el flujo externo en lugar de simulación. Redeploy del backend tras guardar las variables.
El propietario configura titular, teléfono Yape/Plin y métodos en Reservas antes de aceptar pagos.
Probar con un comprobante de prueba claramente identificado antes de aceptar transferencias.

El cliente HTTP usa HTTPS, no sigue redirecciones, no reintenta automáticamente subidas y no
incluye respuestas remotas ni credenciales en errores. El bucket se verifica privado en cada
operación. Las lecturas tienen límite 5 MiB y nombres UUID estrictos. La API de negocio sigue
comprobando pagador/propietario/organizador, identidad, organización y estado antes del acceso.
La clave de servidor no proporciona permisos por persona: estos los impone nuestro backend.

Para VPS puede elegirse PAYMENT_PROOF_STORAGE=filesystem con volumen privado persistente.
No cambiar de adaptador con comprobantes existentes sin copiar y verificar primero sus objetos
con los mismos UUID; no existe migración automática de imágenes.

Verificación: contrato HTTP local (subida PNG, lectura, borrado idempotente, bucket público,
entradas inválidas, error remoto y configuración insegura), regresión filesystem y servicios.
La prueba contra Supabase real requiere bucket y secreto configurados; no confundir pruebas
locales con validación del despliegue.

Verificación de esta integración: mvn clean verify correcto; cinco pruebas nuevas del adaptador
Supabase y cuatro de pagos con PostgreSQL local pasan (adelanto/saldo, cupos e historial).
Frontend: 34 pruebas y typecheck correctos. Pendiente prueba remota con bucket/secreto reales y
activación/despliegue de Render. No se han enviado transferencias ni comprobantes de usuarios.

## Verificación en producción — 24 de octubre de 2026

- Corrección de selección exclusiva del adaptador publicada en f5dda00; Render Live.
- API de capacidades: enabled=true, reviewMinutes=30.
- Bucket payment-proofs: privado, 0 políticas públicas, PNG y máximo 5 MB, verificado en panel.
- Ensayo con jugador.demo: reserva del 26/10/2026, 20:00–21:00, total S/85, adelanto S/17.
- Imagen PRUEBA TECNICA SIN VALOR y referencia PRUEBA-TECNICA-SIN-TRANSFERENCIA cargadas;
  lectura privada comprobada desde pagador y propietario. Sin transferencia bancaria real.
- Antes de aprobar: S/17 en revisión, S/0 confirmado, retención de 30 minutos.
- Propietario aprobó el ensayo: reserva CONFIRMED, S/17 registrado, S/68 pendiente,
  S/0 en revisión y nota explícita de ensayo sin transferencia. No se borró el historial.
- Este registro de ensayo permanece identificado; no representa dinero recibido realmente.
- El selector Plin comparte el flujo, pero este ensayo remoto se ejecutó con Yape.

## Cuenta receptora única y edición compacta — 24 de octubre de 2026

La configuración del complejo se muestra una sola vez en Reservas, con edición mediante FormSheet.
Las tarjetas de reservas conservan importes y comprobantes, sin controles para editar la cuenta.
El aviso sobre simulación queda plegado en el panel general. El formulario tiene controles oscuros,
confirmación explícita de titular/celular y conserva el avance al cerrar sin guardar.
Los permisos backend siguen exigiendo propietario activo del complejo, auditando cambios y
conservando la versión/datos mostrados al pagador en cada comprobante. No implica validación bancaria
ni verificación de titularidad por Yape/Plin; es configuración declarada por el propietario.

## Cobros del partido al organizador — 24 de octubre de 2026

El mismo popup y confirmación de datos se aplica al receptor del partido, con título explícito
Cuenta receptora del organizador. La configuración se asocia al partido (no a la organización
ni a la cuenta del propietario de la cancha). Solo su organizador puede editar y revisar.
El jugador prepara la cuota, ve el destino verificado por el servidor y adjunta su comprobante;
la captura queda en revisión hasta que el organizador confirme. Se conserva historial de corrección,
rechazo y resolución por vencimiento. La imagen utiliza el mismo almacenamiento privado.
Al registrar una decisión se actualizan padrón, ocupación y resumen de ingresos del organizador
sin recarga completa. Los pagos al complejo y al partido siguen siendo obligaciones distintas.
Prueba sintética del organizador: edición del destino MATCH, revisión de comprobante, refresco de
padrón/finanzas y sin desbordamientos en 320, 393 y 768 px. No se ejecutó transferencia real ni
se alteraron cobros de partidos en producción durante este ajuste.

## Estado explícito de confirmación del pago

V37 incorpora PENDING_PAYMENT_CONFIRMATION (Pendiente de confirmación de pago) para la reserva
que tiene comprobante inicial enviado y pendiente de revisión. HOLD mantiene la retención inicial;
PENDING_PAYMENT conserva el pago aún sin comprobante o una corrección/rechazo dentro del plazo.
El estado nuevo bloquea la franja, cuenta como retención activa, aparece en la actividad del jugador,
el panel del propietario, su resumen de pendientes y ambas consultas de la malla. Al aprobar pasa
a CONFIRMED; corrección/rechazo regresa a PENDING_PAYMENT sin prolongar el vencimiento; al vencer
pasa a EXPIRED sin recuperar el horario en una revisión tardía. Cada transición conserva historial.
Un comprobante de BALANCE no cambia una reserva ya CONFIRMED: el estado de revisión del saldo
se conserva en el comprobante para no perder una reserva con adelanto confirmado.

La migración amplía checks, historial, índice de expiración y exclusión GiST anti-solapamiento.
Traslada las reservas PENDING_PAYMENT con comprobante inicial PENDING_REVIEW al nuevo estado,
registrando transición de migración sin tocar importes ni comprobantes. No modifica migraciones
previas ni pagos de simulación. Despliegue: publicar primero frontend compatible con ambos estados,
luego backend con Flyway V37. No ejecutar DDL manual ni modificar directamente estados en producción.

Verificación del estado: V37 aplicada correctamente en PostgreSQL local; cinco pruebas de integración
pasan, incluida exclusión real de una reserva superpuesta durante revisión (SQLSTATE 23P01).
Pruebas de dominio cubren revisión, confirmación, corrección sin extensión y expiración sin recuperación.
Suite backend sin fallos ni errores (238 casos registrados, 7 omitidos por condiciones de ejecución),
34 pruebas frontend correctas y seis escenarios móviles sin desbordamientos ni fallos axe.
Pendiente publicación y aplicación de V37 en el despliegue; no se alteró Supabase de producción.

### Preparación del pago bajo demanda

El pagador abre Preparar pago en un FormSheet del sistema. Método, importe, cuenta validada, referencia, captura y aceptación permanecen dentro del popup. Cerrar conserva el borrador sin renovar la retención; enviar correctamente cierra el popup. Los totales Confirmado y En revisión se muestran únicamente cuando existe al menos un comprobante enviado. Aplica a reservas y partidos mediante el panel compartido.

### Recuperación y comprobante único

V38 guarda la preparación en PostgreSQL, incluyendo la cuenta original y vencimiento, y agrega unicidad de comprobante activo por pagador/recurso (pendiente o requiere resolución). GET /external-payments/preparation recupera solo el borrador del actor y no renueva retención. El archivo no se guarda en el navegador: si no se envió, debe seleccionarse de nuevo. La lista de comprobantes se recupera aunque falle la cuenta receptora; los errores de consulta bloquean nuevos envíos hasta reintentar. ownPayment diferencia al organizador que también juega de los comprobantes de otros participantes.

Las capturas iguales para un mismo receptor siguen bloqueadas entre reservas/partidos. Una corrección solicitada crea una versión auditada enlazada; no se sobrescribe evidencia que ya está en revisión o confirmada. Preparación/envío se serializan por pagador y el servidor determina importe y autorización. Los formatos falsos y dimensiones excesivas se rechazan; se recodifican los píxeles a PNG y se descarta contenido añadido. Esto reduce el riesgo de archivos maliciosos; no sustituye actualizaciones del runtime ni constituye un escaneo antivirus.
