$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

if (-not (Test-Path ".env")) { throw "Falta .env en $projectRoot." }
. "$PSScriptRoot\import-local-env.ps1"
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw "Docker no esta disponible en PATH." }

$env:DEMO_OWNER_EMAIL = if ($env:DEMO_OWNER_EMAIL) { $env:DEMO_OWNER_EMAIL } else { "propietario.local@pulsopiura.test" }
$env:DEMO_ORGANIZER_EMAIL = if ($env:DEMO_ORGANIZER_EMAIL) { $env:DEMO_ORGANIZER_EMAIL } else { "organizador.local@pulsopiura.test" }
$env:DEMO_ADMIN_EMAIL = if ($env:DEMO_ADMIN_EMAIL) { $env:DEMO_ADMIN_EMAIL } else { "admin.organizacion.local@pulsopiura.test" }
$env:DEMO_OPERATOR_EMAIL = if ($env:DEMO_OPERATOR_EMAIL) { $env:DEMO_OPERATOR_EMAIL } else { "operador.local@pulsopiura.test" }
$env:DEMO_PLATFORM_ADMIN_EMAIL = if ($env:DEMO_PLATFORM_ADMIN_EMAIL) { $env:DEMO_PLATFORM_ADMIN_EMAIL } else { "admin.plataforma.local@pulsopiura.test" }
$env:LOCAL_DEMO_USERS_ENABLED = "true"

docker compose up -d --wait postgres keycloak
if ($LASTEXITCODE -ne 0) { throw "No se pudieron iniciar PostgreSQL y Keycloak." }

$previousErrorActionPreference = $ErrorActionPreference
try {
    # Docker Compose escribe progreso normal por stderr. En Windows PowerShell 5,
    # redirigirlo durante una asignacion lo convierte en NativeCommandError.
    $ErrorActionPreference = "Continue"
    $bootstrapOutput = docker compose --progress quiet --profile bootstrap run --rm keycloak-bootstrap 2>&1
    $bootstrapExitCode = $LASTEXITCODE
} finally {
    $ErrorActionPreference = $previousErrorActionPreference
}
if ($bootstrapExitCode -ne 0) {
    $bootstrapOutput | ForEach-Object { Write-Host $_ }
    throw "No se pudieron preparar las identidades de demostracion."
}

$identities = @{}
foreach ($line in $bootstrapOutput) {
    $text = $line.ToString().Trim()
    if ($text -match '^DEMO_ID\|([^|]+)\|([^|]+)\|([^|]+)$') {
        $identities[$Matches[1]] = @{ Email = $Matches[2]; Subject = $Matches[3] }
    }
}
$requiredRoles = @("PLAYER", "ORGANIZER", "OWNER", "ADMIN", "OPERATOR", "PLATFORM_ADMIN")
foreach ($role in $requiredRoles) {
    if (-not $identities.ContainsKey($role)) { throw "Keycloak no devolvio la identidad del rol $role." }
}

$sql = Get-Content -LiteralPath "$projectRoot\infra\postgres\seed-demo.sql" -Raw
$psqlArgs = @("compose", "exec", "-T", "postgres", "psql", "-X",
    "-U", $env:POSTGRES_USER, "-d", $env:POSTGRES_DB, "-v", "ON_ERROR_STOP=1",
    "-v", "player_subject=$($identities.PLAYER.Subject)", "-v", "player_email=$($identities.PLAYER.Email)",
    "-v", "organizer_subject=$($identities.ORGANIZER.Subject)", "-v", "organizer_email=$($identities.ORGANIZER.Email)",
    "-v", "owner_subject=$($identities.OWNER.Subject)", "-v", "owner_email=$($identities.OWNER.Email)",
    "-v", "admin_subject=$($identities.ADMIN.Subject)", "-v", "admin_email=$($identities.ADMIN.Email)",
    "-v", "operator_subject=$($identities.OPERATOR.Subject)", "-v", "operator_email=$($identities.OPERATOR.Email)",
    "-v", "platform_admin_subject=$($identities.PLATFORM_ADMIN.Subject)", "-v", "platform_admin_email=$($identities.PLATFORM_ADMIN.Email)")
$sql | & docker @psqlArgs
if ($LASTEXITCODE -ne 0) { throw "No se pudo cargar la data de demostracion." }

$verificationQuery = "SELECT concat_ws('|',(SELECT count(*) FROM app.users WHERE identity_subject IN ('$($identities.PLAYER.Subject)','$($identities.ORGANIZER.Subject)','$($identities.OWNER.Subject)','$($identities.ADMIN.Subject)','$($identities.OPERATOR.Subject)','$($identities.PLATFORM_ADMIN.Subject)')),(SELECT count(*) FROM app.organization_memberships WHERE organization_id='20000000-0000-0000-0000-000000000001' AND status='ACTIVE'),(SELECT count(*) FROM app.venues WHERE organization_id='20000000-0000-0000-0000-000000000001' AND status='PUBLISHED'),(SELECT count(*) FROM app.sport_spaces WHERE organization_id='20000000-0000-0000-0000-000000000001' AND status='PUBLISHED'),(SELECT count(*) FROM app.availability_rules WHERE organization_id='20000000-0000-0000-0000-000000000001' AND status='ACTIVE'));"
$verification = (& docker compose exec -T postgres psql -X -U $env:POSTGRES_USER -d $env:POSTGRES_DB -Atc $verificationQuery | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $verification -ne "6|3|2|3|21") { throw "La verificacion de la data demo fallo. Resultado: $verification" }

Write-Host "[OK] 6 usuarios y perfiles"
Write-Host "[OK] Roles OWNER, ADMIN y OPERATOR en la organizacion demo"
Write-Host "[OK] Rol global PLATFORM_ADMIN en Keycloak"
Write-Host "[OK] 2 sedes, 3 espacios deportivos y 21 reglas semanales"
Write-Host "[OK] 1 reserva confirmada y 1 partido publicado para pruebas reales"
Write-Host "Todos los usuarios demo utilizan TEST_USER_PASSWORD definido en .env."
foreach ($role in $requiredRoles) { Write-Host "$role`: $($identities[$role].Email)" }
