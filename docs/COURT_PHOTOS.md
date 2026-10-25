# Fotos de canchas y portadas

Los comprobantes de pago continúan privados y separados. Esta funcionalidad administra imágenes editoriales y de catálogo.

## Publicación

Un propietario aprobado crea el complejo, registra una sede y cancha, configura horarios/precios y publica la sede y la cancha. El catálogo público exige complejo activo, sede publicada y cancha publicada. Se puede publicar y completar las fotos después. Recomendamos tres; límite ocho por cancha. La primera es portada hasta elegir otra; retirar la portada selecciona otra foto existente. Los cambios quedan auditados. Solo el propietario/administrador autorizado del complejo puede editar; un operador puede consultar y otro complejo no tiene acceso.

En Mis canchas → complejo → Cancha → Fotos de cancha se cargan imágenes y se elige portada. Explorar muestra la portada y abre la galería con Ver fotos. Las imágenes generadas de la demo se identifican como referencia, no como evidencia de una instalación real.

En Plataforma → Herramientas de administración → Imágenes de plataforma, el administrador cambia Explorar partidos, Explorar canchas, Actividad/reservas, Crear y Gestión de complejos. Publicar imagen cambia la portada sin desplegar el frontend. Restaurar imagen de referencia retira la portada personalizada. Las variables de entorno configuran infraestructura, no fotos editoriales.

## Supabase y Render

1. En el proyecto de Supabase: Storage → New bucket.
2. Nombre exacto `court-photos`; Public bucket desactivado. No agregar políticas de acceso público.
3. Opcionalmente restringir el bucket a `image/png` y 5 MB: el servidor convierte tanto JPG como PNG a PNG antes de guardarlos.
4. En Render → servicio API → Environment:

```dotenv
MEDIA_STORAGE=supabase
MEDIA_SUPABASE_BUCKET=court-photos
```

Se reutilizan las variables existentes `SUPABASE_STORAGE_URL` y `SUPABASE_STORAGE_SECRET_KEY`. Si se desea un proyecto/clave separado, configurar `MEDIA_SUPABASE_URL` y `MEDIA_SUPABASE_SECRET_KEY`. La clave secreta solo va en el backend; nunca usar `NEXT_PUBLIC_` para ella. El bucket de comprobantes `payment-proofs` no cambia.

La configuración del Blueprint declara Supabase para medios. Crear el bucket y revisar las variables antes de probar cargas en producción. Las migraciones V38 (recuperación de pagos) y V39 (fotos/portadas) se aplican con Flyway. Los cambios de esta tarea se validaron en local; no se ha creado el bucket ni desplegado esta funcionalidad en producción.

## Local y VPS

Local usa `MEDIA_STORAGE=filesystem`, carpeta privada `.local/venue-photos`, excluida de Git. En VPS, compose monta `court_photos` en `/srv/pulso/private/court-photos`; incluir ese volumen y la BD en los respaldos. Para mantener Supabase en VPS seleccionar `MEDIA_STORAGE=supabase` y configurar las variables `MEDIA_SUPABASE_*` del ejemplo. Si se migra el almacenamiento de objetos a disco, copiar los PNG preservando exactamente sus claves UUID; mover solo PostgreSQL no mueve las fotos.

## Validación y seguridad

- JPG/PNG de hasta 5 MiB; máximo 6000 píxeles por lado y 8 megapíxeles. El original nunca se conserva: se decodifica, se redibujan los píxeles y se genera un PNG sin metadatos ni contenido añadido.
- Claves UUID aleatorias, rutas controladas por servidor y bucket privado. No se aceptan URLs de almacenamiento ni nombres de archivo como rutas.
- Toda operación de cancha valida usuario, organización, cancha y permiso. La consulta pública verifica el estado de publicación; una cancha archivada o complejo suspendido deja de exponer imágenes.
- Respuestas PNG con `nosniff`, metadatos/objetos sin caché; no se exponen claves secretas ni URLs privadas del bucket. Los bloqueos de cancha serializan límite/portada; las operaciones sobre portadas globales se serializan por ubicación.
- Los objetos nuevos se limpian al revertir una transacción; los anteriores se retiran después del commit. Si falla la eliminación remota, queda un aviso de limpieza pendiente en logs y el objeto ya no es accesible mediante la API por falta de metadatos. No se incorporó antivirus; se mantienen las validaciones y recodificación y deben mantenerse actualizados Java/dependencias.

## API

Con prefijo `/api/v1`:

- `GET/POST /organizations/{org}/spaces/{space}/photos`: consulta/carga multipart `file`, `caption` opcional (200 caracteres).
- `PUT /organizations/{org}/spaces/{space}/photos/{photo}/cover` y `DELETE /organizations/{org}/spaces/{space}/photos/{photo}`.
- `GET /organizations/{org}/spaces/{space}/photos/{photo}/image`: vista autorizada, incluido borrador.
- `GET /public/spaces/{space}/photos` y `GET /public/spaces/{space}/photos/{photo}/image`: solo recursos publicados.
- `GET /platform/visual-assets`, `PUT/DELETE /platform/visual-assets/{slot}`: administrador; PUT multipart `file`.
- `GET /public/visual-assets` y `GET /public/visual-assets/{slot}/image`: portadas públicas. Ubicaciones: `home-matches`, `home-venues`, `activity`, `create`, `complexes`.

Fotos devuelven `{id, caption, cover, position, imageUrl}`; portadas `{slot, imageUrl}`. El frontend construye rutas al API conocido, sin enviar tokens a URLs recibidas como datos.
