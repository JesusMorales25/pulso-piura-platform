$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

function Assert-PortListening {
    param(
        [int]$Port,
        [string]$Service,
        [string]$StartCommand
    )

    $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $listener) {
        throw "[PRECONDICION] $Service no esta iniciado en el puerto $Port. Ejecuta: $StartCommand"
    }
    Write-Host "[OK] $Service escuchando en el puerto $Port"
}

function Test-HttpStatus {
    param(
        [string]$Name,
        [string]$Uri,
        [int]$ExpectedStatus,
        [string]$Method = "GET",
        [hashtable]$Headers = @{}
    )

    try {
        $response = Invoke-WebRequest -Uri $Uri -Method $Method -Headers $Headers -UseBasicParsing -TimeoutSec 10
        $actualStatus = [int]$response.StatusCode
    }
    catch {
        if ($null -eq $_.Exception.Response) {
            throw "[FALLO] $Name no respondio: $($_.Exception.Message)"
        }
        $actualStatus = [int]$_.Exception.Response.StatusCode
    }

    if ($actualStatus -ne $ExpectedStatus) {
        throw "[FALLO] $Name devolvio HTTP $actualStatus; se esperaba $ExpectedStatus."
    }
    Write-Host "[OK] $Name ($actualStatus)"
}

if (-not (Test-Path ".env")) {
    throw "Falta .env en $projectRoot."
}

. "$PSScriptRoot\import-local-env.ps1"

$postgresPort = if ($env:POSTGRES_PORT) { [int]$env:POSTGRES_PORT } else { 5433 }
Assert-PortListening -Port $postgresPort -Service "PostgreSQL" -StartCommand "docker compose up -d postgres keycloak"
Assert-PortListening -Port 8180 -Service "Keycloak" -StartCommand "docker compose up -d postgres keycloak"
Assert-PortListening -Port 8080 -Service "Backend" -StartCommand "powershell -ExecutionPolicy Bypass -File scripts/run-backend.ps1"
Assert-PortListening -Port 3000 -Service "Frontend" -StartCommand "powershell -ExecutionPolicy Bypass -File scripts/run-frontend.ps1"

Test-HttpStatus -Name "Backend saludable" -Uri "http://localhost:8080/actuator/health" -ExpectedStatus 200
Test-HttpStatus -Name "Frontend publico" -Uri "http://localhost:3000/canchas" -ExpectedStatus 200
Test-HttpStatus -Name "Catalogos sin token" -Uri "http://localhost:8080/api/v1/venue-catalogs" -ExpectedStatus 200
Test-HttpStatus -Name "Sedes publicas sin token" -Uri "http://localhost:8080/api/v1/venues?size=20" -ExpectedStatus 200
Test-HttpStatus -Name "API privada protegida" -Uri "http://localhost:8080/api/v1/organizations" -ExpectedStatus 401
Test-HttpStatus -Name "CORS para la web" -Uri "http://localhost:8080/api/v1/venues?size=1" -ExpectedStatus 200 -Headers @{ Origin = $env:WEB_ALLOWED_ORIGIN }

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker no esta disponible en PATH; no se pueden verificar las migraciones V8 a V12."
}

$migrationQuery = "SELECT string_agg(version, ',' ORDER BY installed_rank) FROM app.flyway_schema_history WHERE success AND version IN ('8','9','10','11','12');"
$migrationVersions = docker compose exec -T postgres psql -U $env:POSTGRES_USER -d $env:POSTGRES_DB -Atc $migrationQuery
if ($LASTEXITCODE -ne 0) {
    throw "[FALLO] No se pudo consultar el historial de Flyway."
}
if (($migrationVersions | Out-String).Trim() -ne "8,9,10,11,12") {
    throw "[FALLO] Flyway no reporta V8, V9, V10, V11 y V12 aplicadas. Resultado: $migrationVersions"
}
Write-Host "[OK] Flyway V8, V9, V10, V11 y V12 aplicadas"
Write-Host "Iteracion 3: controles automaticos locales aprobados."
