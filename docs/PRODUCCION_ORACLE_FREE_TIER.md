# Publicación de Pulso Piura en Oracle Cloud Free Tier

## Estado de esta preparación

El repositorio incluye una topología productiva reproducible en `deploy/oracle`: dos bases PostgreSQL aisladas, Keycloak en modo producción, backend, frontend Next.js standalone y Caddy como único punto público con TLS automático. PostgreSQL, Keycloak, backend y frontend no publican puertos del host.

Los pagos reales siguen deshabilitados. `PAYMENTS_MODE=disabled` es obligatorio hasta contratar e integrar un proveedor con confirmación autenticada y conciliación. El despliegue puede usarse como beta funcional sin cobrar dinero real.

Antes de publicar debes rotar el `GOOGLE_CLIENT_SECRET` que actualmente existe en el `.env` local. El valor no se muestra ni se copia a ningún archivo nuevo. Revócalo desde Google Cloud y crea uno nuevo para producción.

## 1. Recursos gratuitos y decisiones de capacidad

Oracle documenta para Always Free, en la región principal de la cuenta, recursos Ampere A1 equivalentes actualmente a 2 OCPU y 12 GB de memoria, junto con 200 GB totales de Block Volume. Los límites y la disponibilidad de capacidad pueden cambiar; compruébalos en la consola antes de crear recursos. Oracle también puede reclamar instancias gratuitas consideradas inactivas durante siete días según sus métricas.

Fuentes oficiales:

- [Oracle Cloud Free Tier](https://docs.oracle.com/iaas/Content/FreeTier/freetier.htm)
- [Recursos Always Free](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)
- [Creación de una instancia](https://docs.oracle.com/en-us/iaas/Content/Compute/Tasks/launchinginstance.htm)
- [Listas de seguridad y recomendación de NSG](https://docs.oracle.com/en-us/iaas/Content/Network/Concepts/securitylists.htm)

Para la beta usa una VM `VM.Standard.A1.Flex` ARM64 con 2 OCPU, 12 GB de RAM y Ubuntu 24.04. Asigna un volumen de arranque de 100 GB. La composición limita aproximadamente 7.25 GB entre servicios y deja margen al sistema, a Docker y a picos de compilación.

## 2. Dominio y DNS

Necesitas un dominio o subdominio que controles. Define dos registros `A` hacia la IP pública reservada de la VM:

- `app.tudominio.com`: frontend y `/api/v1`.
- `auth.tudominio.com`: Keycloak.

Caddy obtendrá certificados TLS cuando los registros ya resuelvan y los puertos 80 y 443 sean accesibles. No uses una IP directa para la beta con cuentas reales porque el flujo OIDC y los navegadores requieren orígenes HTTPS estables.

## 3. Crear la red y la VM

1. Elige con cuidado la región principal al crear la cuenta; los recursos Always Free se crean allí.
2. Crea una VCN con subred pública y una IP pública reservada.
3. Crea un Network Security Group para la VM.
4. Permite entrada TCP 80 y 443 desde `0.0.0.0/0`.
5. Permite TCP 22 únicamente desde tu IP pública de administración.
6. Mantén salida TCP 443 para Google, descarga de imágenes, certificados y actualizaciones.
7. No abras 3000, 5432, 8080 ni 8180.
8. Crea la VM ARM64 e instala tu clave SSH pública.

## 4. Preparar Ubuntu

Conéctate por SSH y actualiza el sistema:

```bash
sudo apt update
sudo apt full-upgrade -y
sudo timedatectl set-timezone America/Lima
```

Instala Docker Engine y el plugin Compose siguiendo la [guía oficial para Ubuntu](https://docs.docker.com/engine/install/ubuntu/). Después habilita el servicio y permite al usuario operar Docker:

```bash
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
```

Cierra la sesión SSH y vuelve a entrar para aplicar el grupo. Verifica:

```bash
docker version
docker compose version
```

Activa actualizaciones automáticas de seguridad:

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## 5. Copiar el proyecto

Este directorio todavía no es un repositorio Git. Copia una versión limpia mediante `rsync`/SCP o inicializa posteriormente un repositorio privado. No copies `.env`, `.local`, `node_modules`, `.next`, `target`, capturas ni backups.

Ejemplo desde tu equipo:

```bash
rsync -av --delete \
  --exclude .env --exclude .local --exclude node_modules --exclude .next --exclude target \
  ./pulso-piura-platform/ ubuntu@IP_PUBLICA:/opt/pulso-piura/
```

En la VM:

```bash
sudo chown -R "$USER":"$USER" /opt/pulso-piura
cd /opt/pulso-piura/deploy/oracle
cp .env.production.example .env.production
chmod 600 .env.production
```

## 6. Crear secretos y completar el entorno

Genera un valor diferente para cada contraseña:

```bash
openssl rand -base64 48
```

Edita `.env.production` y reemplaza todos los valores de ejemplo. `APP_DOMAIN` y `AUTH_DOMAIN` contienen solo el nombre DNS, sin `https://`. Usa el nuevo secreto de Google ya rotado. El archivo está ignorado por Git y debe permanecer con permiso `600`.

El frontend recibe durante la compilación únicamente valores públicos: URL de API, issuer y client ID. `GOOGLE_CLIENT_SECRET`, contraseñas y credenciales PostgreSQL solo llegan a los contenedores que los necesitan.

`PASSWORD_REGISTRATION_ENABLED=false` deja deshabilitado el registro con contraseña hasta configurar SMTP. El acceso y alta mediante Google continúa disponible. Si luego habilitas registro por correo, configura SMTP en Keycloak, prueba entrega y recuperación de cuenta, y recién cambia esa variable a `true`.

## 7. Configurar Google Login

En Google Cloud Console configura el cliente OAuth web:

- Origen JavaScript autorizado: `https://app.tudominio.com`
- URI de redirección autorizada: `https://auth.tudominio.com/realms/pulso-piura/broker/google/endpoint`

No agregues comodines. Conserva separado el cliente de desarrollo local. Google OAuth no tiene un cargo por el inicio de sesión normal, aunque Google exige configurar la pantalla de consentimiento y puede requerir verificación según los scopes y el tipo de publicación.

## 8. Validar configuración y arrancar

Desde `/opt/pulso-piura/deploy/oracle`:

```bash
docker compose --env-file .env.production -f compose.production.yaml config --quiet
docker compose --env-file .env.production -f compose.production.yaml build
docker compose --env-file .env.production -f compose.production.yaml up -d app-db identity-db identity
docker compose --env-file .env.production -f compose.production.yaml --profile bootstrap run --rm identity-bootstrap
docker compose --env-file .env.production -f compose.production.yaml up -d backend frontend caddy
```

El bootstrap ajusta las URLs exactas del cliente `pulso-web`, mantiene PKCE S256, configura Google y crea la cuenta inicial `PLATFORM_ADMIN`. Inicia sesión con la contraseña temporal, cámbiala inmediatamente y activa MFA para la cuenta administrativa desde Keycloak.

Consulta el estado sin imprimir variables de entorno:

```bash
docker compose --env-file .env.production -f compose.production.yaml ps
docker compose --env-file .env.production -f compose.production.yaml logs --tail=100 backend frontend identity caddy
./verify.sh
```

Prueba manualmente:

1. Login Google y cierre de sesión.
2. Acceso denegado a la consola con un jugador normal.
3. Acceso de `PLATFORM_ADMIN` y revisión de solicitudes.
4. Publicación y consulta pública de complejos y negocios.
5. Reserva con pago simulado solo en un ambiente de pruebas; en producción beta `disabled` debe impedir confirmaciones ficticias.
6. Dos intentos simultáneos sobre la misma franja: solo uno puede crear el bloqueo.
7. QR de llegada: emisión por jugador y lectura por el OWNER correcto.

## 9. Backups y restauración

El script crea dumps PostgreSQL en formato custom, suma SHA-256 y conserva siete días locales:

```bash
chmod +x backup.sh verify.sh
./backup.sh
```

Después de cada ejecución copia los dumps a un destino cifrado fuera de la VM. Un backup que permanece solo en la misma VM no protege ante pérdida del volumen o de la cuenta. Programa la ejecución diaria con cron y vigila su código de salida.

Prueba la restauración trimestralmente en bases vacías de un ambiente separado:

```bash
docker compose --env-file .env.production -f compose.production.yaml exec -T app-db \
  pg_restore --clean --if-exists --no-owner -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  < backups/app-FECHA.dump
```

Aplica el mismo procedimiento a `identity-db` con sus variables. Detén backend e identity durante una restauración real, toma un snapshot previo y valida usuarios, reservas, pagos, partidos y migraciones antes de reabrir tráfico.

## 10. Actualizaciones y rollback

Antes de actualizar:

1. Ejecuta tests y builds en local.
2. Ejecuta `backup.sh` y copia los resultados fuera de la VM.
3. Fija y revisa las nuevas versiones de PostgreSQL, Keycloak, Caddy, Java y Node.
4. Construye imágenes y valida salud antes de eliminar las anteriores.

Despliegue habitual:

```bash
docker compose --env-file .env.production -f compose.production.yaml build --pull
docker compose --env-file .env.production -f compose.production.yaml up -d
docker image prune -f
```

Para rollback conserva el código y las imágenes de la versión anterior. Si una migración Flyway ya se aplicó, no edites ni reviertas el archivo: restaura un backup compatible o crea una migración correctiva.

## 11. Operación y seguridad antes de abrir la beta

- Rota el secreto Google detectado y todas las contraseñas usadas en pruebas.
- Ejecuta `npm audit` en un entorno con acceso al registro de npm y resuelve hallazgos aplicables antes de construir la imagen definitiva.
- Programa y prueba la migración de Spring Boot 3.5 a una rama 4.x con soporte vigente antes de operar el servicio públicamente a largo plazo.
- Configura MFA para `PLATFORM_ADMIN` y no compartas esa cuenta.
- Deja `PAYMENTS_MODE=disabled` hasta integrar un proveedor real.
- Verifica semanalmente espacio de disco, memoria, reinicios y expiración de certificados.
- Exporta logs a un destino con retención y alertas; no registres tokens ni secretos.
- Ejecuta backup diario y una restauración de prueba antes de incorporar usuarios reales.
- Publica términos, privacidad, contacto y proceso de eliminación/corrección de datos.
- Ejecuta una prueba de carga con el hardware final y define un límite de usuarios de la beta a partir de resultados medidos.
- Revisa si Oracle marca la instancia Always Free como inactiva y conserva un plan de recuperación.

La revisión se basó en [OWASP Top 10 2025](https://owasp.org/Top10/2025/0x00_2025-Introduction/). OWASP aclara que Top 10 es una base de concientización; antes de manejar pagos reales conviene completar un control OWASP ASVS y un pentest independiente.
