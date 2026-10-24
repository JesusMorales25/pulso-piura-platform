# Supabase para demo y PostgreSQL portable a VPS

Estado actualizado por instrucción del usuario el 23 de octubre: la demo comenzará
con datos nuevos en Supabase. La base vencida de Render no es recuperable y ya no
se requiere importarla. Se conservan las instrucciones de traslado como referencia
para futuras migraciones a VPS; no son un bloqueo para esta inicialización.

## Inicio nuevo aprobado: proyecto de demo

Proyecto: `cwspxfhlarshflihhtsr`, PostgreSQL 17.11. Host Session pooler:
`aws-0-us-east-1.pooler.supabase.com`, puerto 5432, base `postgres`.
Migrador: `postgres.cwspxfhlarshflihhtsr`; ejecución:
`pulso_app.cwspxfhlarshflihhtsr` después de preparar el rol.

Orden para este caso, sin restaurar datos:

1. Verificar que `app` no contiene tablas ajenas o datos a conservar.
2. Ejecutar `deploy/supabase/prepare-restore.sql` para instalar btree_gist y
   `deploy/supabase/bootstrap.sql` para esquema y permisos iniciales.
3. El propietario introduce una contraseña única para `pulso_app` en SQL Editor
   y las contraseñas de ambos usuarios en Render. No se guardan en código/chat.
4. Configurar las variables JDBC indicadas en esta guía y desplegar el backend.
   Flyway crea las tablas y su historial automáticamente; no usar baseline ni
   crear a mano el historial de migraciones.
5. Validar health, migraciones y acceso. Las cuentas Auth0 existentes siguen
   funcionando, pero deberán completar perfiles nuevos. La cuenta verificada
   indicada en PLATFORM_ADMIN_EMAIL recupera administración según las reglas
   actuales; capacidades de dueño/organizador y organizaciones se configuran de nuevo.
6. Crear complejos, canchas y partidos nuevos desde la aplicación con las cuentas
   Auth0 correspondientes. No ejecutar `scripts/seed-demo-data.ps1`: es el cargador
   local ligado a Keycloak y sus identidades no corresponden a esta demo.

Inicialización remota completada el 23 de octubre de 2026 a las 22:28 (America/Lima):
Render desplegó `438117b` en el servicio `pulso-piura-api-jesusmorales25`,
despliegue `dep-dbe29tjrjlhs738pqkjg`, y lo marcó Live. La API pública
`https://pulso-piura-api-jesusmorales25.onrender.com/actuator/health` respondió UP.
Flyway aplicó 36 migraciones sin fallos sobre Supabase PostgreSQL 17.11.
Consulta SQL de verificación: `migrations_ok=36`, `migrations_failed=0`,
`latest_version=36`, `app_tables=35`, `users_new_demo=0`,
`runtime_can_create_tables=false`, `runtime_data_access=true`.

El propietario configuró contraseña/login y secretos de Render; no se copiaron al
repositorio. Auth0 conserva las cuentas existentes, pero no se importó información
de Render ni se inventaron identidades. No se han cargado complejos, partidos o
reservas de muestra. Los perfiles y datos operativos se crearán con los accesos
reales de la demo. No se ha validado aún un flujo autenticado completo desde Vercel.
El primer arranque demoró aproximadamente tres minutos en el cómputo gratuito.

En la validación apareció una carrera de primer ingreso: dos peticiones de un
mismo subject intentaban insertar el usuario, y el catch de clave duplicada dejaba
la transacción PostgreSQL abortada. Se corrige con un advisory lock transaccional
por subject solo cuando falta el usuario y una segunda lectura antes del INSERT.
No se cambian cuentas Auth0, claims, permisos ni migraciones. Regresión:
`CurrentUserConcurrencyDatabaseTest`, ejecutable en PostgreSQL local aislado con
`mvn clean verify -DrunIdentityDatabaseTests=true`. Antes reproducía 23505/25P02;
después ambas peticiones devuelven el mismo usuario y queda un perfil. Verificado
localmente antes de publicar la corrección: 224 pruebas, 0 fallos/errores,
10 omitidas (integraciones opt-in/plataforma), incluida la regresión concurrente
real activada. Corrección publicada en `91fe1e9`, desplegada manualmente en Render
como `dep-dbe2ii0ae00c73bea43g`, Live el 23 de octubre aproximadamente a las 22:46
(America/Lima). La nueva instancia validó las 36 migraciones sin cambios y la
consulta pública de health posterior al despliegue devolvió UP. El flujo completo
de inicio de sesión/consentimiento y creación de datos en Vercel queda para la
validación funcional con las cuentas del usuario; no se introdujeron contraseñas
ni identidades ficticias para simularlo.

No publicar datos ficticios como si fueran complejos reales ni inventar subjects
Auth0 para asignar privilegios. Los datos operativos nuevos deben quedar ligados
a usuarios reales de la demo. Supabase aloja PostgreSQL; Vercel, backend y Auth0
siguen cumpliendo sus funciones.

## Arquitectura y alcance

Vercel → Spring en Render → PostgreSQL en Supabase. Auth0 sigue proporcionando
las cuentas y los tokens; los perfiles, capacidades, permisos, partidos y reservas
viven en `app` y deben restaurarse junto con el historial de Flyway.

No se utiliza SDK de Supabase, Supabase Auth, Data API ni claves anon/service_role.
El navegador solo habla con Spring. Las migraciones SQL existentes no cambian.
La futura salida a PostgreSQL en VPS utiliza las mismas herramientas de respaldo
y las mismas variables JDBC; no requiere instalar toda la plataforma Supabase.

## 1. Recuperar Render antes de cambiar producción

1. No eliminar `pulso-piura-demo-db`. Si está vencida e inaccesible, reactivarla
   según las opciones de Render o localizar un dump válido. Sin una fuente
   accesible/respaldo no podemos recuperar datos desde el código ni desde Auth0.
2. Registrar versión PostgreSQL, número de registros por tabla y última migración.
   La captura del usuario muestra PostgreSQL 18: comprobar la versión real del
   destino Supabase antes de importar. Una restauración hacia una versión menor
   no está garantizada; requiere ensayo y correcciones revisadas, o un destino de
   versión compatible. No modificar el dump a ciegas para ocultar errores.
3. Para el corte definitivo detener las escrituras (suspender API/poner mantenimiento)
   antes del último dump. Mantenerlas detenidas hasta validar el destino.
4. Exportar **solo `app`**, incluidos datos, secuencias, funciones, triggers y
   `flyway_schema_history`. No exportar roles globales ni esquemas internos.

Ejemplo PowerShell con herramientas PostgreSQL instaladas, valores de Connect de
Render y contraseña solicitada interactivamente (`-W`):

```powershell
New-Item -ItemType Directory -Force .local/db-backups | Out-Null
# Usar un nombre nuevo por exportación. No sobrescribir el único respaldo.
pg_dump --host=RENDER_HOST --port=5432 --username=RENDER_USER --dbname=RENDER_DATABASE -W --format=custom --schema=app --no-owner --no-privileges --file=.local/db-backups/render-app-YYYYMMDD-HHMM.dump
if ($LASTEXITCODE -ne 0) { throw 'Exportación fallida; no continuar' }
pg_restore --list .local/db-backups/render-app-YYYYMMDD-HHMM.dump
if ($LASTEXITCODE -ne 0) { throw 'Archivo ilegible; no continuar' }
Get-FileHash .local/db-backups/render-app-YYYYMMDD-HHMM.dump -Algorithm SHA256
```

Usar cliente `pg_dump` de versión compatible con el servidor fuente; conectar con
TLS (`PGSSLMODE=require` en esa sesión). No poner contraseñas en argumentos, URI,
capturas o Git. El dump contiene datos personales: cifrar una copia fuera de este
equipo, limitar acceso y conservarlo hasta verificar la restauración.
Los comprobantes de pago son archivos: respaldar y trasladar su volumen privado
por separado si existen. La BD guarda sus referencias, no sus imágenes.

## 2. Crear Supabase

1. Crear un proyecto exclusivo para la demo en la organización correspondiente.
   Elegir una región cercana al backend de Render (actualmente Virginia) y una
   contraseña de BD única, guardada en un gestor de contraseñas.
2. Activar MFA en la cuenta que administra Supabase.
3. En configuración de **Data API**, deshabilitar Data API. No añadir `app` a
   **Exposed schemas**. No habilitar Supabase Auth: se conserva Auth0.
4. Abrir **Connect → Session pooler**. Copiar host, puerto `5432`, base y usuario
   exactos. El usuario administrativo suele ser `postgres.PROJECT_REF`; no deducir
   el host de ejemplos. No usar Transaction pooler (`6543`) para esta configuración.
5. Verificar la versión con `select version();`. Para pasar de PostgreSQL 18 a
   una versión menor, detener el corte hasta completar un ensayo de restauración.
6. Exigir SSL. La URL documentada usa `sslmode=require` (cifra; no verifica nombre
   ni certificado). Para producción usar `verify-full` y la CA de Supabase instalada
   en el contenedor mediante `sslrootcert`, validando primero pooler/hostname.

## 3. Restaurar datos y preparar permisos

El destino no debe contener tablas de Pulso ni historial Flyway. **No arrancar el
backend contra el destino antes de importar:** Flyway crearía tablas vacías y el
dump entraría en conflicto.

Comprobar en SQL Editor:

```sql
select schema_name from information_schema.schemata where schema_name = 'app';
```

Antes de restaurar, ejecutar `deploy/supabase/prepare-restore.sql` como administrador.
Instala `btree_gist` si falta: un dump limitado a `app` no incluye automáticamente
esa extensión, necesaria para impedir reservas solapadas. Se usa el esquema
`extensions`; no se crea `app` antes de importar. Si la extensión ya existe se
conserva su ubicación y debe comprobarse mediante el ensayo de restauración.

Si ya existe `app`, inspeccionarlo antes de continuar. No ejecutar `DROP SCHEMA`
para resolverlo sin revisar qué datos contiene. Para un proyecto nuevo sin `app`,
restaurar conectando como `postgres.PROJECT_REF` mediante Session pooler:

```powershell
$env:PGSSLMODE = 'require'
pg_restore --host=SUPABASE_SESSION_HOST --port=5432 --username=postgres.PROJECT_REF --dbname=postgres -W --no-owner --no-privileges --single-transaction --exit-on-error .local/db-backups/render-app-YYYYMMDD-HHMM.dump
if ($LASTEXITCODE -ne 0) { throw 'Restauración fallida; mantener producción sin cambiar' }
```

No usar `--clean`, `--create`, `--disable-triggers`, `baselineOnMigrate` ni
`flyway repair` para forzar una restauración fallida. PostgreSQL debe restaurar
relaciones, restricciones y funciones correctamente.

Después de importar, ejecutar `deploy/supabase/bootstrap.sql` en SQL Editor como
`postgres`. Es idempotente, crea el rol `pulso_app` sin login inicialmente, concede
acceso a datos y prepara permisos por defecto para las futuras migraciones de
`postgres`. Ejecutar después, **solo en SQL Editor**, con una contraseña nueva:

```sql
alter role pulso_app login password 'CONTRASENA_UNICA_DEL_USUARIO_DE_EJECUCION';
```

No copiar la contraseña real al repositorio. Para una demo nueva SIN datos que
   preservar, se ejecuta bootstrap antes del primer arranque: este es el caso
finalmente aprobado para nuestra demo. Las instrucciones de restauración de esta
sección solo se aplican cuando existe un respaldo que conservar.

Verificar y comparar con el origen antes de cambiar el backend:

```sql
select version();
select installed_rank, version, description, success
from app.flyway_schema_history order by installed_rank;
select schemaname, tablename from pg_tables where schemaname = 'app' order by tablename;
-- Conteos exactos de todas las tablas, sin mostrar datos personales:
create temporary table pulso_migration_counts (table_name text, row_count bigint);
do $$
declare t record; n bigint;
begin
  for t in select tablename from pg_tables where schemaname = 'app' loop
    execute format('select count(*) from app.%I', t.tablename) into n;
    insert into pulso_migration_counts values (t.tablename, n);
  end loop;
end $$;
select * from pulso_migration_counts order by table_name;
```

Las secuencias también deben conservar su valor; el dump completo de `app` incluye
`SEQUENCE SET`. Validar creación de un registro en el ensayo, además de lectura.

## 4. Variables en Render y despliegue

Eliminar la variable antigua `RENDER_DATABASE_URL` del servicio. Aunque el nuevo
entrypoint da prioridad a `DATABASE_URL`, no conviene dejar un enlace obsoleto.
Configurar **en Render, nunca Vercel**:

| Variable | Valor |
| --- | --- |
| `DATABASE_URL` | `jdbc:postgresql://HOST_SESSION_POOLER:5432/postgres?sslmode=require&connectTimeout=10&socketTimeout=60&tcpKeepAlive=true` |
| `POSTGRES_USER` | `pulso_app.PROJECT_REF` (usuario del pooler para el rol creado) |
| `POSTGRES_PASSWORD` | Contraseña del rol `pulso_app` |
| `MIGRATION_DATABASE_URL` | Misma URL JDBC del Session pooler |
| `MIGRATION_POSTGRES_USER` | `postgres.PROJECT_REF` |
| `MIGRATION_POSTGRES_PASSWORD` | Contraseña administrativa de la BD Supabase |
| `SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE` | `3` |
| `SPRING_DATASOURCE_HIKARI_MINIMUM_IDLE` | `0` |
| `SPRING_PROFILES_ACTIVE` | `production` |
| `PAYMENTS_MODE` | `simulation` mientras Render no tenga almacenamiento privado persistente |

Mantener las variables Auth0, `PLATFORM_ADMIN_EMAIL`, CORS y memoria ya configuradas.
No se requiere `SUPABASE_URL`, anon key ni service_role key en ninguna plataforma.
Si el pooler requiere datos diferentes para un rol personalizado, verificar la
conexión del rol antes del despliegue. Las credenciales migratorias distintas son
opcionales en el código, pero se configuran aquí para limitar el usuario JPA.

El Blueprint actualizado ya no administra la base vieja de Render. Quitar la
definición de YAML no la borra, según la política de Render. **No eliminarla
manualmente hasta cerrar y respaldar la migración.** En servicios existentes,
`sync: false` no sustituye valores antiguos por magia: editar estas variables
manualmente y revisar la vista previa de sincronización del Blueprint.

Desplegar solo después de restaurar y comparar. Revisar logs de Flyway (validación
de checksums y aplicación de migraciones pendientes) y `/actuator/health` = `UP`.
Iniciar sesión con los mismos usuarios Auth0: verificar sus perfiles, roles por
organización, partidos y reservas. Probar un alta y un conflicto de reserva;
confirmar que un jugador no pueda leer recursos privados de otro usuario.
Vercel no cambia si se conserva el dominio de la API.

## 5. Reversión y respaldo

Antes de abrir escrituras: si falla la validación, restaurar la configuración
anterior y reactivar la fuente. No eliminar ni sobrescribir ninguna base.
Después de abrir escrituras en Supabase no volver a la copia antigua directamente:
se perderían las operaciones nuevas; congelar escrituras y migrar/reconciliar
los cambios primero. Nunca mantener dos backends escribiendo a distintas copias.

Programar dumps cifrados fuera de Supabase, con política de retención y prueba de
restauración. El plan gratuito puede pausarse por inactividad y no sustituye un
plan de continuidad. Los backups de BD no incluyen objetos de Storage ni archivos
locales de comprobantes.

## 6. Pasar a VPS

- **Solo backend:** se puede mantener Supabase; `deploy/vps/compose.external-db.yaml`
  levanta API y Caddy sin PostgreSQL. Usar las mismas variables y comprobar latencia.
- **Todo en VPS:** `deploy/vps/compose.auth0.yaml` incluye PostgreSQL privado. Hacer
  mantenimiento, exportar `app`, instalar `btree_gist` con `prepare-restore.sql`,
  restaurar sin propietarios/ACL en un volumen nuevo,
  recrear grants, validar y cambiar la conexión a `jdbc:postgresql://app-db:5432/pulso_piura`.
  Su usuario `pulso_app` también puede ejecutar Flyway; eliminar variables
  `MIGRATION_*` externas al usar esa variante. La versión destino debe ser compatible
  con la fuente (no restaurar de una versión mayor a la imagen 17 sin ensayo).
- Copiar por separado los archivos de comprobantes y conservar rutas/keys privadas.
- La imagen PostgreSQL no publica puerto al exterior. Configurar parches, alertas,
  backups cifrados externos y ensayo de restauración antes de usar datos reales.

## Verificación de esta entrega

`sh backend/tests/database-config.test.sh` verifica prioridad JDBC sobre enlace
legado, compatibilidad local y rechazo de credenciales/URI incorrecta sin imprimir
secretos. CI ejecuta esa prueba junto con Maven.

Verificado localmente el 23 de octubre de 2026: `mvn verify`; bootstrap idempotente;
arranque del JAR en perfil production con migrador y usuario JPA distintos; las 36
migraciones aplicadas y health `UP`; usuario de ejecución sin CREATE en `app`.
Ensayo PostgreSQL 18 → 18 con dump/restore de `app`, extensión `btree_gist` en
`extensions`, historial Flyway y escritura posterior con secuencia conservada.
Este ensayo no prueba una restauración hacia una versión menor ni conectividad
con un proyecto Supabase real.

La conexión remota, la importación de los datos del usuario y
la comparación de datos requieren acceso a ambos servicios y no se simulan como
completadas.

## Referencias

- https://supabase.com/docs/guides/getting-started/quickstarts/spring-boot
- https://supabase.com/docs/guides/database/connecting-to-postgres
- https://supabase.com/docs/guides/api/securing-your-api
- https://supabase.com/docs/guides/platform/ssl-enforcement
- https://supabase.com/docs/guides/platform/backups
- https://render.com/docs/infrastructure-as-code
