# ADR-008 — PostgreSQL portable para la demostración

Estado: aceptada por solicitud del usuario el 23 de octubre de 2026.

Supabase aloja exclusivamente PostgreSQL. Auth0 conserva identidad y Spring conserva
la autorización de negocio. No se agrega SDK, Supabase Auth, Realtime ni acceso a
tablas desde el navegador. El esquema `app` no se expone en la Data API, que debe
deshabilitarse para este proyecto.

Se elige JDBC estándar y Session pooler (5432) con TLS para la demo en Render.
`DATABASE_URL` explícita tiene prioridad sobre el enlace legado a Render. El
Blueprint deja de crear o referenciar una base gratuita de Render; retirarla del
YAML no autoriza eliminar la base existente ni perder sus datos.

El usuario de ejecución tiene permisos de datos en `app`; Flyway puede usar un
usuario de migración distinto. Para esta demo las migraciones siguen ejecutándose
al arrancar, por lo que el proceso conserva también esa credencial. Separar las
migraciones en un job con secreto independiente es una mejora para producción.

Alternativas: PostgreSQL de pago en Render requiere reactivar el servicio vencido;
PostgreSQL en VPS requiere operar backups y parches desde ahora. La elección del
usuario es Supabase para demo y mantener ambas alternativas de VPS abiertas.

Plan: probar prioridad de URL y rechazo de formatos inválidos; desacoplar Blueprint;
documentar bootstrap, traslado del esquema `app` con historial Flyway, validación,
rollback y VPS. No se ejecuta importación ni cambio remoto sin destino y respaldo.

La migración de datos exige exportación/restauración y una ventana sin escrituras.
Actualización del usuario el 23 de octubre: la BD de Render no es recuperable;
se autoriza empezar la demo con datos nuevos en Supabase. No se exige importar
Render para ese inicio. Los accesos siguen en Auth0 y los datos operativos se
crean nuevamente con las identidades auténticas, sin ejecutar el seed Keycloak.
Los comprobantes son archivos privados y no forman parte de un dump PostgreSQL.
La demo en Render gratuito sigue en simulación hasta disponer de almacenamiento
privado persistente. No se modifica ninguna migración Flyway existente.
