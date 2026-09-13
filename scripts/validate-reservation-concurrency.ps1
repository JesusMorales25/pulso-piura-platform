$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

if (-not (Test-Path ".env")) { throw "Falta .env en $projectRoot." }
. "$PSScriptRoot\import-local-env.ps1"
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw "Docker no esta disponible en PATH." }

$fixtureQuery = @"
SELECT concat_ws('|', s.organization_id, s.id, u.id)
FROM app.sport_spaces s
CROSS JOIN LATERAL (SELECT id FROM app.users WHERE status='ACTIVE' ORDER BY created_at LIMIT 1) u
WHERE s.status='PUBLISHED'
ORDER BY s.created_at
LIMIT 1;
"@
$fixture = (& docker compose exec -T postgres psql -X -U $env:POSTGRES_USER -d $env:POSTGRES_DB -Atc $fixtureQuery | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or -not $fixture) {
    throw "[PRECONDICION] No se encontro una cancha publicada y un usuario activo. Ejecuta scripts/seed-demo-data.ps1."
}
$organizationId, $spaceId, $customerId = $fixture.Split("|")
$firstId = [guid]::NewGuid().ToString()
$secondId = [guid]::NewGuid().ToString()
$firstKey = [guid]::NewGuid().ToString()
$secondKey = [guid]::NewGuid().ToString()
$fingerprint = "0" * 64

function New-InsertSql {
    param([string]$ReservationId, [string]$IdempotencyKey)
    return @"
BEGIN;
INSERT INTO app.reservations (
  id, organization_id, sport_space_id, customer_user_id, starts_at, ends_at,
  status, total_minor, deposit_minor, currency, expires_at, idempotency_key,
  request_fingerprint, created_at, updated_at, version
) VALUES (
  '$ReservationId', '$organizationId', '$spaceId', '$customerId',
  date_trunc('day', now() + interval '2 years') + interval '10 hours',
  date_trunc('day', now() + interval '2 years') + interval '11 hours',
  'HOLD', 1000, 0, 'PEN', now() + interval '10 minutes', '$IdempotencyKey',
  '$fingerprint', now(), now(), 0
);
SELECT pg_sleep(2);
COMMIT;
"@
}

$databaseUser = $env:POSTGRES_USER
$databaseName = $env:POSTGRES_DB
$firstSql = New-InsertSql -ReservationId $firstId -IdempotencyKey $firstKey
$secondSql = New-InsertSql -ReservationId $secondId -IdempotencyKey $secondKey

$runner = {
    param($Root, $User, $Database, $Sql)
    Set-Location $Root
    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        $output = $Sql | & docker compose exec -T postgres psql -X -v ON_ERROR_STOP=1 -U $User -d $Database 2>&1
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }
    [pscustomobject]@{ ExitCode = $exitCode; Output = ($output | Out-String) }
}

$firstJob = Start-Job -ScriptBlock $runner -ArgumentList $projectRoot, $databaseUser, $databaseName, $firstSql
$secondJob = Start-Job -ScriptBlock $runner -ArgumentList $projectRoot, $databaseUser, $databaseName, $secondSql
Wait-Job -Job $firstJob, $secondJob | Out-Null
$results = @()
$results += Receive-Job -Job $firstJob
$results += Receive-Job -Job $secondJob
Remove-Job $firstJob, $secondJob -Force

$successes = @($results | Where-Object { $_.ExitCode -eq 0 }).Count
$conflicts = @($results | Where-Object { $_.ExitCode -ne 0 -and $_.Output -match "ex_reservations_no_blocking_overlap" }).Count

$cleanup = "DELETE FROM app.reservations WHERE id IN ('$firstId','$secondId');"
& docker compose exec -T postgres psql -X -v ON_ERROR_STOP=1 -U $databaseUser -d $databaseName -c $cleanup *> $null
if ($LASTEXITCODE -ne 0) { throw "[FALLO] La limpieza de reservas de prueba no pudo completarse." }

if ($successes -ne 1 -or $conflicts -ne 1) {
    throw "[FALLO] Se esperaba una insercion exitosa y un conflicto GiST. Exitos: $successes; conflictos: $conflicts."
}
Write-Host "[OK] Dos transacciones compitieron por la misma franja: una gano y una fue rechazada."
Write-Host "[OK] Las reservas temporales de la prueba fueron eliminadas."
