$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker no está instalado o no está en PATH. Instala Docker Desktop y vuelve a ejecutar este script."
}
docker info *> $null
if ($LASTEXITCODE -ne 0) {
    throw "Docker Desktop esta instalado, pero el motor no responde. Abre Docker Desktop y espera hasta que indique que esta listo."
}
if (-not (Test-Path ".env")) {
    throw "Falta .env. Copia .env.example y define valores locales."
}

function Assert-PortAvailable {
    param([int]$Port, [string]$Service)
    $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($listener) {
        throw "$Service no puede iniciar: el puerto $Port ya esta ocupado por el PID $($listener.OwningProcess). Ejecuta scripts\stop-local.ps1 y vuelve a intentarlo."
    }
}

# Maven y Next.js necesitan las mismas variables que Docker Compose.
. "$PSScriptRoot\import-local-env.ps1"

docker compose up -d --wait --remove-orphans postgres keycloak
if ($LASTEXITCODE -ne 0) {
    docker compose logs keycloak --tail 160
    throw "No se pudieron iniciar PostgreSQL y Keycloak. Revisa el log anterior."
}

try {
    & "$PSScriptRoot\bootstrap-keycloak-local.ps1"
} catch {
    docker compose logs keycloak --tail 160
    throw "No se pudo preparar el usuario local de Keycloak mediante la API administrativa. $($_.Exception.Message)"
}

Assert-PortAvailable -Port 8080 -Service "El backend"
Assert-PortAvailable -Port 3000 -Service "El frontend"

New-Item -ItemType Directory -Force "$projectRoot\.local" | Out-Null
# Turbopack puede conservar un manifiesto de rutas anterior tras cambiar entre
# `next build` y `next dev`. Es caché generada: se regenera al iniciar Next.
$nextCache = Join-Path $projectRoot "frontend\.next"
if (Test-Path -LiteralPath $nextCache) {
    Remove-Item -LiteralPath $nextCache -Recurse -Force
}
$maven = (Get-Command "mvn.cmd" -ErrorAction Stop).Source
$npm = (Get-Command "npm.cmd" -ErrorAction Stop).Source
$backend = Start-Process -FilePath $maven -ArgumentList "-Dmaven.test.skip=true","spring-boot:run" -WorkingDirectory "$projectRoot\backend" -WindowStyle Hidden -RedirectStandardOutput "$projectRoot\.local\backend.out.log" -RedirectStandardError "$projectRoot\.local\backend.err.log" -PassThru
$frontend = Start-Process -FilePath $npm -ArgumentList "run","dev" -WorkingDirectory "$projectRoot\frontend" -WindowStyle Hidden -RedirectStandardOutput "$projectRoot\.local\frontend.out.log" -RedirectStandardError "$projectRoot\.local\frontend.err.log" -PassThru

@{ backendPid = $backend.Id; frontendPid = $frontend.Id; startedAt = (Get-Date).ToString("o") } | ConvertTo-Json | Set-Content "$projectRoot\.local\processes.json"

function Wait-HttpService {
    param(
        [string]$Name,
        [string]$Uri,
        [System.Diagnostics.Process]$Process,
        [string]$OutputLog,
        [string]$ErrorLog,
        [int]$TimeoutSeconds = 120
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        $Process.Refresh()
        if ($Process.HasExited) {
            Write-Host "--- Ultimas lineas de $OutputLog ---"
            if (Test-Path $OutputLog) { Get-Content $OutputLog -Tail 100 }
            if ((Test-Path $ErrorLog) -and (Get-Item $ErrorLog).Length -gt 0) {
                Write-Host "--- Ultimas lineas de $ErrorLog ---"
                Get-Content $ErrorLog -Tail 100
            }
            throw "$Name termino durante el arranque con codigo $($Process.ExitCode)."
        }
        try {
            $response = Invoke-WebRequest -Uri $Uri -UseBasicParsing -TimeoutSec 3
            if ([int]$response.StatusCode -ge 200 -and [int]$response.StatusCode -lt 400) {
                Write-Host "$Name listo: $Uri"
                return
            }
            throw "$Name respondio HTTP $($response.StatusCode) en $Uri."
        } catch {
            $statusCode = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { $null }
            if ($statusCode -eq 404 -or $_.Exception.Message -match "HTTP 404") {
                throw "$Name inicio, pero la ruta de verificacion devolvio 404: $Uri. Revisa $OutputLog."
            }
            Start-Sleep -Seconds 2
        }
    }
    throw "$Name no respondio en $Uri despues de $TimeoutSeconds segundos. Revisa $OutputLog y $ErrorLog."
}

try {
    Wait-HttpService -Name "Backend" -Uri "http://localhost:8080/actuator/health" -Process $backend -OutputLog "$projectRoot\.local\backend.out.log" -ErrorLog "$projectRoot\.local\backend.err.log"
    Wait-HttpService -Name "Frontend" -Uri "http://localhost:3000/canchas" -Process $frontend -OutputLog "$projectRoot\.local\frontend.out.log" -ErrorLog "$projectRoot\.local\frontend.err.log"
} catch {
    foreach ($processId in @($backend.Id, $frontend.Id)) {
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    }
    throw
}

Write-Host "Servicios iniciados: web http://localhost:3000, API http://localhost:8080, Keycloak http://localhost:8180"
Write-Host "Administrador local: consulta DEMO_PLATFORM_ADMIN_EMAIL y TEST_USER_PASSWORD en .env"
