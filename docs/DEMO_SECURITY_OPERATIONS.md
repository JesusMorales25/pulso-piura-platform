# Operación segura de la demostración

## Configuración y migración

Mantener Auth0 como OIDC del ambiente actual. Keycloak queda como alternativa y no necesita
levantarse en Render. No guardar contraseñas del producto ni secretos en variables NEXT_PUBLIC.
Las variables públicas son el emisor, ID del cliente, audiencia y URL de API, no client secrets.

Flyway debe aplicar `V35__shared_write_rate_limits.sql` antes de aceptar tráfico de esta versión.
El contador usa PostgreSQL con UPSERT atómico, compartido entre instancias. `API_WRITE_LIMIT_PER_MINUTE`
es opcional y predetermina 60 escrituras por minuto por sujeto/emisor autenticado. No registra tokens,
correos ni IP; guarda una huella SHA-256. Las ventanas antiguas se eliminan cada hora cuando tienen
más de un día. El límite no protege los GET anónimos ni el login hospedado en Auth0: configurar protección
contra abuso en el proveedor y en el borde antes de ampliar el piloto.

La API es stateless y autoriza bearer tokens, sin cookies de sesión del backend. CSRF se deshabilita
para esta arquitectura; no trasladar esa configuración a un futuro BFF con cookies. Los tokens OIDC
están en sessionStorage de la pestaña, accesible a JavaScript. La CSP existente permite unsafe-inline
para la compilación actual de Next.js. Evaluar BFF/HttpOnly y CSP con nonces antes de cobros reales.

## Identidad y MFA

En Auth0, activar MFA y exigirlo para cuentas privilegiadas mediante las políticas/Actions del
tenant; verificar enrolamiento, un login con segundo factor, recuperación y revocación con cada
administrador y personal privilegiado. El código del producto **no acredita** que esa configuración
esté aplicada. Habilitar Attack Protection y límites de recuperación en el proveedor. No marcar
correos reales como verificados sin comprobar su titularidad.

Las invitaciones a complejos exigen correo verificado en backend. Las consultas administrativas
también verifican el estado ACTIVE de la cuenta local. Para revocar administradores, retirar los
roles del proveedor, revisar el allowlist `PLATFORM_ADMIN_EMAIL` y revocar sesiones en Auth0; un correo
conservado en ese allowlist puede seguir derivando rol global. El producto no contiene una consola
de revocación de sesiones del proveedor.

El bootstrap alternativo de Keycloak no vuelve a habilitar cuentas existentes ni reasigna roles
revocados. La cuenta inicial nueva de administrador requiere CONFIGURE_TOTP. Esto no configura por
sí solo las políticas MFA de todos los propietarios/operadores; probar sus flujos en el proveedor.
No usar RESET_BOOTSTRAP_USER_PASSWORDS en arranques ordinarios.

## Datos, pagos e imágenes

Usar datos de prueba hasta publicar responsable, contacto de privacidad y reclamos. Los avisos
accesibles están en `/informacion/{privacidad,cookies,terminos,cancelaciones}`, versión
`2026-10-09-demo`. El servidor valida esa versión y conserva fecha/versiones en user_consents.
Los registros anteriores permanecen como evidencia histórica; no se reinterpretan como aceptación
de la versión nueva. No hay consentimiento de marketing ni analíticas opcionales integradas.

No activar cobros reales: PAYMENTS_MODE sigue siendo simulation/disabled según ambiente. Un registro
manual de pago directo no demuestra liquidación bancaria. Antes de producción comercial, definir
pasarela, webhooks verificables, reembolsos y reclamos; revisar la regla anterior sin devoluciones.

Las imágenes binarias de negocios no publicados no son públicas; la vista previa usa una ruta
administrativa autenticada y no-store. Las URLs externas de imágenes siguen siendo contenido del
administrador: también contactan al proveedor externo cuando se muestran. Mantener registro de
licencias según ASSET_PROVENANCE.md. El registro de una calificación por el complejo no es una reseña.

## Conservación, respaldo e incidentes

Plazos técnicos implementados: sessionStorage hasta cerrar pestaña; ventana de rate limit 24 h
con limpieza horaria; respaldo local Oracle existente siete días. La preferencia de distrito no
tiene expiración automática. Las cuentas, reservas, pagos y auditorías no tienen eliminación automática:
el responsable debe fijar finalidad y plazo, proceso de solicitudes de derechos y cierre del piloto.
No eliminar registros financieros ni usuarios automáticamente sin decidir trazabilidad y obligaciones.

Configurar respaldo cifrado fuera de la instancia, acceso mínimo y restauración en un ambiente aislado.
El script Oracle utiliza permisos restrictivos y checksum; no implementa por sí mismo cifrado ni
transferencia externa. Render gratuito y la configuración efectiva de su backup no se verificaron.

Ante un incidente: retirar permisos y sesiones del proveedor, rotar credenciales afectadas sin
copiarlas en tickets/logs, preservar evidencia mínima y auditorías, limitar acceso al servicio,
evaluar personas afectadas y obligaciones de comunicación con asesoría. Configurar alertas de 5xx,
429, indisponibilidad y acciones privilegiadas en la infraestructura; no registrar cuerpos completos,
Authorization, contraseñas ni QR opacos. Comprobar alertas y restauración antes del lanzamiento.

## Validación legal externa

Jurisdicción inicial: Piura, Perú. Revisar Ley 29733 y su reglamento DS 016-2024-JUS, bancos de datos,
transferencias internacionales, ejercicio de derechos, tratamiento de menores y gestión de incidentes.
Fuentes: [ANPD](https://www.gob.pe/institucion/anpd/normas-legales/6554453-n-016-2024-jus).
Para oferta comercial, revisar Código de Protección y Defensa del Consumidor, publicidad, precios,
reembolsos y Libro de Reclamaciones, incluyendo plataformas digitales. Fuentes:
[Indecopi](https://www.gob.pe/institucion/indecopi/normas-legales/1244218-29571) y
[Ley sobre plataformas digitales](https://busquedas.elperuano.pe/dispositivo/NL/2457203-1).
No se certifica cumplimiento por publicar estas páginas. RUC, razón social, dirección, canales y
políticas comerciales siguen pendientes por decisión del responsable para esta demostración.

## Verificación reproducible

Frontend: npm ci; npm run test; npm run lint; npm run typecheck; npm run build.
Auditoría: npm audit --omit=dev; revisar también npm audit completo antes de cambiar herramientas.
No aplicar --force para degradar Next.js o su configuración ESLint a una versión incompatible.

Accesibilidad: levantar una compilación local en 3002 con las mismas variables públicas OIDC,
importarlas al ejecutar el test, y usar npm run test:a11y. Requiere navegador de Playwright instalado
o A11Y_BROWSER_CHANNEL=chrome. El test rechaza hosts remotos, usa sesiones y API sintéticas para
roles, analiza contraste/etiquetas/semántica con axe y prueba foco/teclado. No verifica autenticación
real ni constituye certificación WCAG; revisar con lector de pantalla y usuarios reales.

Backend: mvn verify. Las pruebas de concurrencia existentes necesitan su entorno específico;
si están omitidas no presentar el resultado como validación de carreras en una base real. Comprobar
la migración y el límite compartido en PostgreSQL local antes de subir al ambiente compartido.
