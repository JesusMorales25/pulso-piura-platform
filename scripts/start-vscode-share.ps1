param(
    [string]$PublicUrl = ""
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$localDirectory = Join-Path $projectRoot ".local"
$stateFile = Join-Path $localDirectory "processes.json"
$sharePort = 9000
Set-Location $projectRoot
New-Item -ItemType Directory -Force $localDirectory | Out-Null

function Stop-TrackedApplicationProcesses {
    if (-not (Test-Path -LiteralPath $stateFile)) { return }
    $state = Get-Content -Raw -LiteralPath $stateFile | ConvertFrom-Json
    foreach ($processId in @($state.backendPid, $state.frontendPid, $state.shareGatewayPid)) {
        if ($processId) { & taskkill.exe /PID $processId /T /F 2>$null | Out-Null }
    }
}

function Assert-PortAvailable {
    param([int]$Port, [string]$Service)
    $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($listener) { throw "$Service no puede iniciar: el puerto $Port esta ocupado por el PID $($listener.OwningProcess)." }
}

function Start-ShareGateway {
    Assert-PortAvailable -Port $sharePort -Service "La puerta de enlace"
    $node = (Get-Command "node.exe" -ErrorAction Stop).Source
    return Start-Process -FilePath $node `
        -ArgumentList (Join-Path $PSScriptRoot "share-gateway.mjs") `
        -WorkingDirectory $projectRoot `
        -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $localDirectory "share-gateway.out.log") `
        -RedirectStandardError (Join-Path $localDirectory "share-gateway.err.log") `
        -PassThru
}

if ([string]::IsNullOrWhiteSpace($PublicUrl)) {
    $listener = Get-NetTCPConnection -LocalPort $sharePort -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $listener) {
        $gateway = Start-ShareGateway
        $state = if (Test-Path -LiteralPath $stateFile) { Get-Content -Raw -LiteralPath $stateFile | ConvertFrom-Json } else { [pscustomobject]@{} }
        if ($null -eq $state.PSObject.Properties["shareGatewayPid"]) {
            $state | Add-Member -NotePropertyName shareGatewayPid -NotePropertyValue $gateway.Id
        } else {
            $state.shareGatewayPid = $gateway.Id
        }
        $state | ConvertTo-Json | Set-Content -LiteralPath $stateFile
    } else {
        try {
            $gatewayHealth = Invoke-RestMethod -Uri "http://127.0.0.1:$sharePort/__pulso_share/health" -TimeoutSec 3
            if ($gatewayHealth.service -ne "pulso-share") { throw "Respuesta inesperada" }
        } catch {
            throw "El puerto $sharePort ya esta ocupado por otro servicio. Libera el puerto y vuelve a ejecutar la tarea."
        }
    }
    Write-Host "Puerto local preparado: http://localhost:$sharePort"
    Write-Host "En VS Code abre PUERTOS, reenvia el puerto $sharePort, cambia Visibilidad a Publico y copia la Direccion reenviada."
    Write-Host 'Luego ejecuta: powershell -ExecutionPolicy Bypass -File scripts\start-vscode-share.ps1 -PublicUrl "https://TU-DIRECCION"'
    exit 0
}

$publicUri = $null
if (-not [Uri]::TryCreate($PublicUrl, [UriKind]::Absolute, [ref]$publicUri) -or
    $publicUri.Scheme -ne "https" -or
    -not [string]::IsNullOrWhiteSpace($publicUri.Query) -or
    -not [string]::IsNullOrWhiteSpace($publicUri.Fragment) -or
    ($publicUri.AbsolutePath -ne "/")) {
    throw "PublicUrl debe ser la URL HTTPS raiz entregada por VS Code, sin rutas ni parametros."
}
$PublicUrl = $PublicUrl.TrimEnd("/")

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw "Docker no esta disponible en PATH." }
docker info *> $null
if ($LASTEXITCODE -ne 0) { throw "Docker Desktop no responde." }
if (-not (Test-Path -LiteralPath ".env")) { throw "Falta el archivo .env local." }

Stop-TrackedApplicationProcesses
foreach ($port in @(3000, 8080, $sharePort)) {
    $listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($processId in @($listeners | Select-Object -ExpandProperty OwningProcess -Unique)) {
        $process = Get-CimInstance Win32_Process -Filter "ProcessId = $processId" -ErrorAction SilentlyContinue
        if ($process -and $process.CommandLine -like "*$projectRoot*") {
            & taskkill.exe /PID $processId /T /F 2>$null | Out-Null
        }
    }
}

. "$PSScriptRoot\import-local-env.ps1"
$env:FRONTEND_PUBLIC_URL = $PublicUrl
$env:KEYCLOAK_PUBLIC_URL = $PublicUrl
$env:NEXT_PUBLIC_API_BASE_URL = "$PublicUrl/api/v1"
$env:NEXT_PUBLIC_OIDC_ISSUER = "$PublicUrl/realms/pulso-piura"
$env:OIDC_ISSUER_URI = "$PublicUrl/realms/pulso-piura"
$env:OIDC_JWK_SET_URI = "http://127.0.0.1:8180/realms/pulso-piura/protocol/openid-connect/certs"
$env:WEB_ALLOWED_ORIGIN = $PublicUrl

docker compose up -d --wait --remove-orphans postgres keycloak
if ($LASTEXITCODE -ne 0) { throw "No se pudo iniciar la infraestructura local." }
& "$PSScriptRoot\bootstrap-keycloak-local.ps1"

Assert-PortAvailable -Port 3000 -Service "El frontend"
Assert-PortAvailable -Port 8080 -Service "El backend"
$nextCache = Join-Path $projectRoot "frontend\.next"
if (Test-Path -LiteralPath $nextCache) { Remove-Item -LiteralPath $nextCache -Recurse -Force }

$maven = (Get-Command "mvn.cmd" -ErrorAction Stop).Source
$npm = (Get-Command "npm.cmd" -ErrorAction Stop).Source
$backend = Start-Process -FilePath $maven -ArgumentList "-Dmaven.test.skip=true","spring-boot:run" -WorkingDirectory "$projectRoot\backend" -WindowStyle Hidden -RedirectStandardOutput "$localDirectory\backend.out.log" -RedirectStandardError "$localDirectory\backend.err.log" -PassThru
$frontend = Start-Process -FilePath $npm -ArgumentList "run","dev" -WorkingDirectory "$projectRoot\frontend" -WindowStyle Hidden -RedirectStandardOutput "$localDirectory\frontend.out.log" -RedirectStandardError "$localDirectory\frontend.err.log" -PassThru
$gateway = Start-ShareGateway

@{
    backendPid = $backend.Id
    frontendPid = $frontend.Id
    shareGatewayPid = $gateway.Id
    publicUrl = $PublicUrl
    startedAt = (Get-Date).ToString("o")
} | ConvertTo-Json | Set-Content -LiteralPath $stateFile

$deadline = (Get-Date).AddSeconds(150)
do {
    try {
        $health = Invoke-RestMethod -Uri "http://127.0.0.1:$sharePort/__pulso_share/health" -TimeoutSec 3
        $web = Invoke-WebRequest -Uri "http://127.0.0.1:$sharePort/canchas" -UseBasicParsing -TimeoutSec 5
        if ($health.status -eq "UP" -and [int]$web.StatusCode -lt 400) { break }
    } catch {
        Start-Sleep -Seconds 2
    }
} while ((Get-Date) -lt $deadline)
if ((Get-Date) -ge $deadline) { throw "La aplicacion compartida no respondio. Revisa los logs de .local." }

Write-Host "Pulso Piura compartido en $PublicUrl"
Write-Host "Redireccion de Google que debes registrar: $PublicUrl/realms/pulso-piura/broker/google/endpoint"
Write-Warning "Mientras el puerto sea Publico, cualquier persona con la URL podra usar este entorno de prueba."
