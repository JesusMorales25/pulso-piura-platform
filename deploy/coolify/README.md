# Publicar Pulso Piura en Oracle con Coolify

Esta variante mantiene la aplicación en una VM gratuita de Oracle y usa Coolify como panel visual. Coolify administra compilaciones, variables, dominios, certificados HTTPS, logs y reinicios. Los datos permanecen en volúmenes Docker estándar y pueden migrarse posteriormente a Docker Compose directo u otro proveedor.

## Arquitectura

- `frontend`: Next.js público en `app.tudominio.com`.
- `backend`: API Spring Boot pública en `api.tudominio.com`.
- `identity`: Keycloak público en `auth.tudominio.com`.
- `app-db` e `identity-db`: PostgreSQL internos, sin dominio ni puerto público.
- `identity-bootstrap`: tarea de una sola ejecución que configura el realm, Google, PKCE y la cuenta inicial de plataforma.

Los pagos reales permanecen deshabilitados mediante `PAYMENTS_MODE=disabled`. Para una demostración cerrada puede establecerse temporalmente `simulation`, mostrando claramente que no existe un cobro real.

## 0. Subir el proyecto a GitHub

Sube la carpeta `pulso-piura-platform` como un único repositorio privado. No crees repositorios separados para frontend y backend. Deben incluirse `backend`, `frontend`, `infra`, `deploy`, `scripts`, `docs`, `.github` y los archivos de configuración de la raíz.

No deben subirse `.env`, `.local`, `node_modules`, `.next`, `target`, `.m2`, logs ni backups. `.env.example` y `deploy/oracle/.env.production.example` sí se suben porque contienen nombres y valores de ejemplo, no credenciales reales. El `.gitignore` ya aplica estas exclusiones.

En GitHub crea un repositorio **Private** vacío: no agregues README, `.gitignore` ni licencia desde GitHub. En el equipo local configura tu identidad, crea el primer commit y conecta la URL que muestre GitHub:

```powershell
cd D:\pulso-piura-proyecto\pulso-piura-platform
git config user.name "TU NOMBRE"
git config user.email "TU CORREO DE GITHUB"
git commit -m "Preparar Pulso Piura para despliegue"
git remote add origin https://github.com/TU_USUARIO/pulso-piura-platform.git
git push -u origin main
```

El repositorio local ya está inicializado sobre `main`. Antes de cada push puedes confirmar las exclusiones con `git status --short --ignored`.

## 1. Crear la VM en Oracle

1. Crea la cuenta en [Oracle Cloud](https://cloud.oracle.com/) y elige cuidadosamente la **Home Region**; los recursos Always Free se crean allí y esa región no se cambia después.
2. Abre **Networking → Virtual Cloud Networks → Start VCN Wizard**.
3. Selecciona **Create VCN with Internet Connectivity**.
4. Usa `pulso-vcn` como nombre y conserva los rangos propuestos para VCN y subred pública.
5. Termina el asistente y espera a que cree VCN, Internet Gateway, tablas de rutas y subred pública.
6. Dentro de `pulso-vcn`, abre **Network Security Groups → Create NSG** y llámalo `pulso-web-nsg`.
7. Abre **Compute → Instances → Create instance**.
8. Usa `pulso-piura-prod` como nombre.
9. En **Image**, selecciona **Canonical Ubuntu 24.04 LTS** compatible con ARM y marcada como elegible para Always Free.
10. En **Shape**, elige **Ampere → VM.Standard.A1.Flex → 2 OCPU → 12 GB RAM**. No elijas capacidad preemptible.
11. En Networking selecciona `pulso-vcn`, su subred pública, **Assign a public IPv4 address** y el NSG `pulso-web-nsg`.
12. Genera una clave SSH desde Oracle y descarga la privada, o carga tu clave pública existente. Conserva la privada fuera del proyecto y nunca la subas a GitHub.
13. Configura un boot volume de 100 GB y crea la instancia.

Si Oracle muestra `Out of host capacity`, prueba otro Availability Domain de la misma Home Region o inténtalo más tarde. No cambies a una shape de pago solo para evitar el error.

Cuando la VM esté disponible, reemplaza la IP efímera por una **Reserved Public IP** regional desde **Networking → IP Management → Reserved Public IPs** y asígnala a la IP privada principal de la VNIC. Esa dirección seguirá existiendo aunque posteriormente reemplaces la VM.

En el Network Security Group permite:

- TCP 22 únicamente desde tu IP pública.
- TCP 80 y 443 desde Internet.
- TCP 6001, 6002 y 8000 únicamente desde tu IP durante la instalación de Coolify.

No abras 3000, 5432, 8080 ni 8180.

Para cada regla usa protocolo TCP, tipo de origen CIDR y estos valores:

| Puerto | Source CIDR | Uso |
|---:|---|---|
| 22 | `TU_IP_PUBLICA/32` | SSH |
| 80 | `0.0.0.0/0` | HTTP y certificados |
| 443 | `0.0.0.0/0` | Aplicación HTTPS |
| 6001 | `TU_IP_PUBLICA/32` | Actualización del panel durante instalación |
| 6002 | `TU_IP_PUBLICA/32` | Terminal web durante instalación |
| 8000 | `TU_IP_PUBLICA/32` | Panel inicial de Coolify |

Conserva la regla de salida predeterminada hacia `0.0.0.0/0`; se necesita para descargar imágenes, renovar certificados y conectar con Google.

## 2. Instalar y asegurar Coolify

Conéctate por SSH y ejecuta el instalador oficial:

```powershell
ssh -i C:\RUTA\CLAVE_PRIVADA ubuntu@IP_PUBLICA_RESERVADA
```

Ya dentro de Ubuntu, actualiza el sistema y cambia la zona horaria:

```bash
sudo apt update
sudo apt full-upgrade -y
sudo timedatectl set-timezone America/Lima
sudo reboot
```

Vuelve a conectarte por SSH y ejecuta:

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Abre `http://IP_DE_LA_VM:8000` y crea inmediatamente la cuenta administradora. La primera persona que complete ese registro controla el servidor. Activa MFA, configura un dominio HTTPS para el panel y después elimina la regla pública del puerto 8000.

Guarda fuera de la VM una copia cifrada de `/data/coolify/source/.env`; contiene la clave que Coolify usa para proteger sus secretos.

## 3. Elegir dominio temporal o propio

### Alternativa gratuita para la primera prueba

Deja vacío **Servers → General → Wildcard Domain**. Coolify puede generar para cada servicio una dirección basada en la IP y `sslip.io`, sin crear cuenta ni registros DNS. En cada servicio pulsa **Generate Domain**, cambia el prefijo a `https://` y conserva el puerto interno correspondiente.

`sslip.io` es adecuado para verificar el despliegue, pero Coolify lo considera un dominio temporal. Google exige que una aplicación OAuth pública use un dominio que controles y puedas verificar. Por eso el Compose deja Google desactivado inicialmente mediante `GOOGLE_LOGIN_ENABLED=false`.

### Dominio propio para Google Login público

Cuando tengas un dominio que controles, crea tres registros DNS `A` hacia la IP reservada:

- `app.tudominio.com`
- `api.tudominio.com`
- `auth.tudominio.com`

Verifica el dominio con Google Search Console y configura la pantalla OAuth. Un subdominio gratuito de terceros puede servir para una prueba técnica, pero no garantiza que Google acepte la verificación de propiedad para una aplicación pública.

## 4. Preparar Google Login

1. En Google Cloud crea credenciales OAuth de producción diferentes a las locales.
2. Configura como URI autorizada:
   `https://auth.tudominio.com/realms/pulso-piura/broker/google/endpoint`.
3. Configura como origen autorizado:
   `https://app.tudominio.com`.

## 5. Crear la aplicación en Coolify

1. Crea un proyecto y un ambiente `production`.
2. Selecciona **New resource → Private repository → Docker Compose**.
3. Conecta GitHub y selecciona el repositorio y la rama de producción.
4. Usa `/` como **Base Directory**.
5. Usa `/deploy/coolify/compose.coolify.yaml` como **Docker Compose Location**.
6. No actives **Raw Compose Deployment**.
7. Guarda para que Coolify detecte los seis servicios y genere las contraseñas `SERVICE_PASSWORD_*`.

## 6. Configurar dominios

En cada servicio abre **Domains** y asigna:

- `frontend`: `https://app.tudominio.com:3000`
- `backend`: `https://api.tudominio.com:8080`
- `identity`: `https://auth.tudominio.com:8080`

El puerto después de los dos puntos es interno. Los usuarios seguirán entrando por HTTPS 443. No asignes dominios a las bases ni al bootstrap.

Comprueba en las variables generadas que:

- `SERVICE_FQDN_FRONTEND_3000` contiene el dominio de la aplicación.
- `SERVICE_FQDN_BACKEND_8080` contiene el dominio de la API.
- `SERVICE_FQDN_IDENTITY_8080` contiene el dominio de autenticación.

Los dominios deben estar definidos antes del primer despliegue porque sus valores se incorporan al build del frontend y a la configuración de Keycloak.

## 7. Completar variables secretas

En **Environment Variables** completa únicamente:

- `PLATFORM_ADMIN_EMAIL`: correo real del administrador inicial.
- `GOOGLE_LOGIN_ENABLED`: usa `false` con el dominio temporal; cambia a `true` cuando Google esté configurado.
- `GOOGLE_CLIENT_ID`: obligatorio cuando Google esté habilitado.
- `GOOGLE_CLIENT_SECRET`: obligatorio cuando Google esté habilitado; márcalo como secreto.

Conserva `PAYMENTS_MODE=disabled` para una beta pública. Usa `simulation` solamente en una demostración controlada y vuelve a deshabilitarlo antes de recibir usuarios externos.

Coolify genera y conserva las contraseñas de PostgreSQL, Keycloak y del administrador inicial mediante las variables `SERVICE_PASSWORD_64_*`. No reemplaces esas variables por claves escritas en el repositorio.

La primera contraseña de plataforma queda en `SERVICE_PASSWORD_64_PLATFORM_ADMIN`. Úsala una vez, cámbiala al iniciar sesión y activa MFA. El bootstrap tiene deshabilitado el restablecimiento de contraseñas existentes.

`SERVICE_PASSWORD_64_KEYCLOAK_ADMIN` permite el primer acceso administrativo al realm `master`. Después del despliegue crea una cuenta administrativa nominal con MFA, verifica que funciona y elimina `kc_bootstrap_admin` desde Keycloak. La variable puede permanecer definida para futuros arranques: Keycloak no vuelve a crear el usuario mientras la base ya esté inicializada.

## 8. Desplegar y verificar

Pulsa **Deploy**. El orden esperado es:

1. PostgreSQL.
2. Keycloak.
3. Bootstrap de identidad.
4. Backend.
5. Frontend.

`identity-bootstrap` debe terminar con código `0` y permanecer detenido; es una tarea de inicialización y está excluida del estado de salud global.

Verifica:

1. `https://auth.tudominio.com/realms/pulso-piura/.well-known/openid-configuration` responde JSON.
2. `https://api.tudominio.com/actuator/health` responde `UP`.
3. La aplicación carga por HTTPS.
4. Login y logout con Google.
5. Un jugador no puede abrir la consola de plataforma.
6. El administrador puede revisar solicitudes.
7. Dos reservas simultáneas de una misma franja permiten un solo bloqueo.
8. Con `PAYMENTS_MODE=disabled`, el checkout debe impedir una confirmación ficticia. En una demostración cerrada con `simulation`, reserva, simulación y QR deben completar el flujo.

Si cambias cualquiera de los tres dominios, fuerza una reconstrucción sin caché del frontend y vuelve a ejecutar el bootstrap.

## 9. Backups y salida de Coolify

Configura backups de ambos volúmenes y conserva copias cifradas fuera de Oracle. También guarda `/data/coolify/source/.env`. Prueba una restauración antes de incorporar usuarios reales.

Coolify no crea dependencia propietaria en los datos: `app_postgres` e `identity_postgres` son volúmenes Docker y las imágenes usan formatos estándar. Para retirar Coolify, exporta ambas bases con `pg_dump`, despliega `deploy/oracle/compose.production.yaml` directamente y restaura los dumps.

Fuentes oficiales:

- [Instalación de Coolify](https://coolify.io/docs/start-with-self-hosted)
- [Docker Compose en Coolify](https://coolify.io/docs/applications/builds/docker-compose)
- [Oracle Always Free](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)
