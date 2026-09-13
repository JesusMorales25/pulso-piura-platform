$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

if (-not (Test-Path ".env")) { throw "Falta .env en $projectRoot." }
. "$PSScriptRoot\import-local-env.ps1"

function Assert-PortListening {
    param([int]$Port, [string]$Service, [string]$StartCommand)
    $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $listener) { throw "[PRECONDICION] $Service no esta iniciado. Ejecuta: $StartCommand" }
    Write-Host "[OK] $Service escuchando en el puerto $Port"
}

function Get-Status {
    param([string]$Uri, [string]$Method = "GET")
    try {
        return [int](Invoke-WebRequest -Uri $Uri -Method $Method -UseBasicParsing -TimeoutSec 10).StatusCode
    }
    catch {
        if ($null -eq $_.Exception.Response) { throw "[FALLO] $Uri no respondio: $($_.Exception.Message)" }
        return [int]$_.Exception.Response.StatusCode
    }
}

Assert-PortListening -Port 8080 -Service "Backend" -StartCommand "powershell -ExecutionPolicy Bypass -File scripts/run-backend.ps1"
Assert-PortListening -Port 3000 -Service "Frontend" -StartCommand "powershell -ExecutionPolicy Bypass -File scripts/run-frontend.ps1"

$venues = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/venues?size=1" -TimeoutSec 10
if ($venues.items.Count -lt 1) { throw "[PRECONDICION] No existe una sede publicada. Ejecuta scripts/seed-demo-data.ps1." }
$slug = $venues.items[0].publicSlug
$spaces = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/venues/$slug/spaces" -TimeoutSec 10
if ($spaces.Count -lt 1) { throw "[PRECONDICION] La sede $slug no tiene canchas publicadas." }

$spaceId = $spaces[0].id
$date = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
$bookableStatus = Get-Status -Uri "http://localhost:8080/api/v1/spaces/$spaceId/bookable-slots?date=$date"
if ($bookableStatus -ne 200) { throw "[FALLO] bookable-slots devolvio HTTP $bookableStatus; se esperaba 200." }
Write-Host "[OK] Disponibilidad reservable publica (200)"

$privateStatus = Get-Status -Uri "http://localhost:8080/api/v1/me/reservations"
if ($privateStatus -ne 401) { throw "[FALLO] Historial sin token devolvio HTTP $privateStatus; se esperaba 401." }
Write-Host "[OK] Historial propio protegido (401 sin token)"

$createStatus = Get-Status -Uri "http://localhost:8080/api/v1/reservations" -Method "POST"
if ($createStatus -ne 401) { throw "[FALLO] Creacion sin token devolvio HTTP $createStatus; se esperaba 401." }
Write-Host "[OK] Creacion de reserva protegida (401 sin token)"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker no esta disponible en PATH; no se puede verificar la exclusion GiST."
}
$constraintQuery = "SELECT count(*) FROM pg_constraint WHERE conname='ex_reservations_no_blocking_overlap';"
$constraintCount = (& docker compose exec -T postgres psql -X -U $env:POSTGRES_USER -d $env:POSTGRES_DB -Atc $constraintQuery | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $constraintCount -ne "1") { throw "[FALLO] No se encontro la exclusion de solapamientos." }
Write-Host "[OK] Constraint GiST de solapamientos presente"
Write-Host "Iteracion 4C-4D: controles locales basicos aprobados."
Write-Host "Siguiente control: powershell -ExecutionPolicy Bypass -File scripts/validate-reservation-concurrency.ps1"
