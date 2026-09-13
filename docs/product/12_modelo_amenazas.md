# 12. Modelo de amenazas

## Alcance

Primera evaluación STRIDE para identidad, frontend, API, base de datos, pagos, archivos, notificaciones y operación administrativa.

## Activos críticos

- cuentas y sesiones;
- teléfonos, perfiles y preferencias;
- membresías, roles y permisos;
- disponibilidad y reservas;
- órdenes y evidencia de pago;
- reputación, reportes y sanciones;
- datos de torneos;
- logs y auditoría;
- secretos e infraestructura.

## Fronteras de confianza

1. navegador ↔ Next.js;
2. Next.js ↔ Keycloak;
3. frontend/BFF ↔ Spring Boot;
4. Spring Boot ↔ PostgreSQL/Redis/S3;
5. backend ↔ pagos/WhatsApp/correo;
6. operadores ↔ panel administrativo.

## Amenazas prioritarias

| ID | Amenaza | Riesgo | Controles principales |
|---|---|---|---|
| TH-001 | Robo de sesión/token | Alto | BFF/cookies HttpOnly, PKCE, CSP, tokens cortos, revocación |
| TH-002 | Acceso a datos de otro complejo | Crítico | tenant obligatorio, autorización contextual, pruebas negativas |
| TH-003 | IDOR sobre reservas/partidos | Alto | autorización por recurso, consultas filtradas, IDs no predecibles |
| TH-004 | Escalada de privilegios | Crítico | permisos backend, MFA admin, auditoría, no autoasignación |
| TH-005 | Doble reserva | Alto | constraint, transacción, locking e idempotencia |
| TH-006 | Falsificación de pago/webhook | Crítico | firma del proveedor, importe en servidor, idempotencia, conciliación |
| TH-007 | Carga de archivo malicioso | Alto | tipo/tamaño, antivirus, almacenamiento aislado, URL temporal |
| TH-008 | Enumeración de usuarios/OTP | Medio-alto | respuestas uniformes, rate limit, expiración y bloqueo progresivo |
| TH-009 | Abuso de partidos/reportes | Medio-alto | límites, verificación, moderación y reputación |
| TH-010 | Inyección/XSS | Alto | validación, consultas parametrizadas, encoding, CSP |
| TH-011 | CSRF | Alto si hay cookies | SameSite, token CSRF, verificación de origen |
| TH-012 | Exposición en logs | Alto | redacción, prohibición de tokens/OTP, acceso restringido |
| TH-013 | Dependencia vulnerable | Alto | SCA, actualizaciones, SBOM y revisión CI |
| TH-014 | Pérdida de datos | Alto | backups cifrados, restauración probada, retención |
| TH-015 | Abuso administrativo | Crítico | privilegio mínimo, MFA, auditoría y alertas |
| TH-016 | Indisponibilidad/DDoS | Medio-alto | CDN/WAF, límites, autoscaling y degradación controlada |

## Escenarios críticos

### Reserva simultánea

Dos usuarios intentan reservar el mismo espacio y horario. El control no puede depender del frontend.

Controles:

- constraint/exclusión de base de datos;
- transacción;
- idempotency key;
- respuesta conflictiva 409;
- prueba concurrente automatizada.

### Administrador de otro tenant

Un administrador modifica el UUID de una reserva para acceder a otro complejo.

Controles:

- consulta por `reservation_id AND organization_id`;
- verificación de membership activa;
- 404/403 consistente según política;
- auditoría de intentos repetidos.

### Pago informado por captura

Un usuario carga una imagen alterada o reutilizada.

Controles:

- captura nunca equivale a confirmación automática;
- estado `PENDING_VERIFICATION`;
- referencia única;
- conciliación del operador/proveedor;
- detección de duplicados.

## Criterios de aceptación de seguridad

- ninguna operación crítica confía solo en el frontend;
- aislamiento multitenant tiene pruebas automatizadas;
- rutas no declaradas quedan autenticadas por defecto;
- no se publican datos personales innecesarios;
- secretos no están en repositorio ni imagen;
- vulnerabilidades críticas bloquean despliegue;
- restauración y respuesta a incidentes se ejercitan antes del lanzamiento.

## Referencias de control

- OWASP ASVS 5.0 como línea base de verificación;
- OWASP API Security Top 10;
- prácticas de Spring Security y OIDC;
- Ley peruana N.° 29733 y su reglamento vigente;
- principio de responsabilidad proactiva.

