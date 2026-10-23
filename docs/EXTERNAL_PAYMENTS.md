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
