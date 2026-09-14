# Compartir Pulso Piura desde VS Code

Este modo publica temporalmente el entorno local completo mediante un único
puerto. La puerta de enlace del puerto `9000` distribuye las solicitudes entre
el frontend, la API y Keycloak. Las rutas administrativas y de métricas no se
exponen.

## 1. Iniciar el entorno local

```powershell
powershell -ExecutionPolicy Bypass -File scripts\start-local.ps1
```

## 2. Preparar el puerto compartido

Desde **Terminal > Ejecutar tarea**, ejecuta
`Pulso: preparar puerto compartido`. También puedes usar:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\start-vscode-share.ps1
```

Abre la vista **PUERTOS** de VS Code, selecciona **Reenviar un puerto**, escribe
`9000` y cambia **Visibilidad del puerto** a **Público**. Copia la dirección
HTTPS que muestra VS Code.

## 3. Reiniciar con la dirección pública

```powershell
powershell -ExecutionPolicy Bypass -File scripts\start-vscode-share.ps1 `
  -PublicUrl "https://DIRECCION-ENTREGADA-POR-VSCODE"
```

El script configura esa dirección para el frontend, CORS, validación JWT,
redirecciones OIDC y Keycloak. La URL compartida abre la aplicación completa.

## 4. Habilitar Google en la dirección temporal

En Google Cloud Console agrega esta URI a **URIs de redireccionamiento
autorizados** del cliente OAuth de Pulso Piura:

```text
https://DIRECCION-ENTREGADA-POR-VSCODE/realms/pulso-piura/broker/google/endpoint
```

El acceso por correo funciona sin este paso. Google exige registrar cada URI
de retorno exacta; si VS Code cambia la dirección pública, actualízala en
Google Cloud y vuelve a ejecutar el paso 3.

## 5. Cerrar el acceso

```powershell
powershell -ExecutionPolicy Bypass -File scripts\stop-local.ps1
```

También cambia la visibilidad del puerto o elimina el reenvío en VS Code. Usa
este mecanismo solo para demostraciones temporales: una URL pública permite el
acceso a cualquier persona que la conozca y depende de que tu equipo permanezca
encendido.
