# 6. Seguridad y privacidad

## Objetivos

1. Proteger cuentas y datos personales.
2. Evitar que un complejo vea información de otro.
3. Prevenir reservas y pagos duplicados.
4. Mantener trazabilidad de acciones sensibles.
5. Recuperar el servicio ante fallos.

## Controles de identidad

- proveedor OIDC independiente del dominio del producto;
- Keycloak como opción recomendada para la primera arquitectura profesional;
- verificación de celular o correo mediante OTP con expiración, según capacidades configuradas;
- límite de intentos y espera progresiva;
- sesiones seguras, rotación y revocación;
- segundo factor para administradores cuando sea viable;
- prohibición de compartir cuentas administrativas;
- revisión periódica de accesos.

## Autorización

Modelo RBAC inicial:

| Rol | Alcance |
|---|---|
| Jugador | su perfil, participaciones y pagos |
| Capitán | partidos que administra |
| Operador de complejo | reservas y operación asignada |
| Administrador de complejo | configuración y usuarios de su organización |
| Organizador | torneos asignados |
| Soporte | acceso limitado y auditado |
| Administrador global | configuración del producto bajo privilegio mínimo |

Toda autorización debe aplicarse en backend y validar recurso, acción y tenant.

## Separación identidad, perfil y autorización

No se almacenará todo en Keycloak ni todo en una tabla de usuarios de Spring.

| Capa | Información |
|---|---|
| Proveedor OIDC/Keycloak | credenciales, sesión, MFA, identidad base y `sub` |
| Base del producto | perfil deportivo, preferencias y consentimiento de negocio |
| Autorización del producto | memberships, roles contextuales y permisos |
| Spring Security | validación del token y aplicación de las decisiones |

El JWT puede incluir roles globales o scopes estables, pero los permisos dependientes de una organización se validan contra el backend. Esto evita permisos obsoletos y tokens excesivamente grandes.

## Validación del token en Spring Boot

El Resource Server debe validar al menos:

- firma mediante JWKS;
- `iss` esperado;
- `aud` de la API;
- `exp` y `nbf`;
- algoritmo permitido;
- scopes o authorities necesarias.

La autorización fina se aplica con reglas HTTP de denegación por defecto y seguridad de métodos mediante `@EnableMethodSecurity` y `@PreAuthorize` o un servicio de autorización centralizado.

## Protección de datos

- HTTPS/TLS en tránsito;
- cifrado administrado en base de datos y almacenamiento;
- secretos fuera del código fuente;
- evidencias de pago privadas y con URL temporal;
- enmascaramiento de teléfono cuando no sea necesario mostrarlo;
- minimización de datos solicitados;
- consentimiento separado para marketing;
- proceso para acceso, corrección y eliminación de datos.

## Seguridad de aplicación

- validación estricta de entradas;
- consultas parametrizadas/ORM;
- protección contra XSS, CSRF, inyección y carga insegura de archivos;
- límites de frecuencia para login, OTP, reservas y publicaciones;
- política de contenido y moderación;
- dependencias escaneadas y actualizadas;
- revisión basada en OWASP ASVS y OWASP Top 10.

## Pagos y reservas

- clave de idempotencia por operación;
- importe calculado en servidor;
- validación criptográfica de webhooks;
- no confiar en capturas como confirmación automática;
- conciliación y estados separados de orden/transacción;
- registro de devoluciones y actor responsable;
- bloqueo transaccional para evitar doble reserva.

## Logs y auditoría

Registrar:

- accesos administrativos;
- cambios de roles;
- cambios de precios y disponibilidad;
- confirmación/cancelación de reservas;
- cambios de pago y devolución;
- sanciones y resultados de torneo;
- exportaciones de datos.

No registrar códigos OTP, tokens, números completos o secretos.

## Resiliencia

- copias automáticas cifradas;
- restauración probada;
- definición futura de RPO/RTO según criticidad;
- alertas por errores, latencia y fallos de integraciones;
- procedimientos de incidente y comunicación;
- ambiente de producción separado.

## Privacidad y cumplimiento

Antes del piloto con datos reales se debe revisar la Ley peruana de Protección de Datos Personales y su reglamentación vigente con asesoría competente. Se necesitarán, como mínimo:

- política de privacidad;
- términos del servicio;
- consentimiento y finalidades;
- identificación del responsable del tratamiento;
- contratos con proveedores encargados;
- procedimiento de derechos del titular;
- reglas especiales si se incorporan menores.

## Controles previos al piloto

- [ ] Inventario de datos personales.
- [ ] Matriz de permisos probada.
- [ ] Política de privacidad y términos disponibles.
- [ ] Backups y restauración probados.
- [ ] Logs sin secretos.
- [ ] Protección de endpoints críticos.
- [ ] Canal de reporte y respuesta a incidentes.
- [ ] Revisión de dependencias y configuración.
- [ ] Validación automática de aislamiento entre organizaciones.
- [ ] Pruebas negativas por endpoint y permiso.
