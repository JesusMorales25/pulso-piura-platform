[CmdletBinding()]
param([string]$OutputPath)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $OutputPath = Join-Path $ProjectRoot "docs\CODEBASE_INDEX.md"
} elseif (-not [IO.Path]::IsPathRooted($OutputPath)) {
    $OutputPath = Join-Path $ProjectRoot $OutputPath
}
$OutputPath = [IO.Path]::GetFullPath($OutputPath)

function Relative([string]$Path) {
    $RootUri = New-Object Uri(($ProjectRoot.TrimEnd('\') + '\'))
    $PathUri = New-Object Uri($Path)
    [Uri]::UnescapeDataString($RootUri.MakeRelativeUri($PathUri).ToString())
}

function Add-Line([Collections.Generic.List[string]]$Lines, [string]$Value = "") {
    $Lines.Add($Value)
}

$ProjectFiles = @(
    Get-ChildItem -LiteralPath $ProjectRoot -Recurse -File | Where-Object {
        $_.FullName -notmatch '[\\/](node_modules|\.next|target|build|\.git|\.idea|\.tmp|\.m2|\.npm-cache|\.local|\.vscode)[\\/]' -and
        $_.Name -notin @('.env', 'tsconfig.tsbuildinfo') -and
        $_.FullName -ne $OutputPath
    }
)
$Pages = @(Get-ChildItem "$ProjectRoot\frontend\app" -Recurse -Filter page.tsx | Sort-Object FullName)
$Features = @(Get-ChildItem "$ProjectRoot\frontend\features" -Directory | Sort-Object Name)
$ModuleRoot = "$ProjectRoot\backend\src\main\java\com\pulsopiura\platform"
$Modules = @(Get-ChildItem $ModuleRoot -Directory | Sort-Object Name)
$Controllers = @(Get-ChildItem "$ProjectRoot\backend\src\main\java" -Recurse -Filter '*Controller.java' | Sort-Object FullName)
$Migrations = @(
    Get-ChildItem "$ProjectRoot\backend\src\main\resources\db\migration" -File |
        Sort-Object { [int]([regex]::Match($_.Name, '^V(\d+)').Groups[1].Value) }
)
$ValidationScripts = @(Get-ChildItem "$ProjectRoot\scripts" -Filter 'validate-*.ps1' | Sort-Object Name)

$Signatures = $ProjectFiles | Sort-Object FullName | ForEach-Object {
    "$(Relative $_.FullName)|$($_.Length)|$($_.LastWriteTimeUtc.Ticks)"
}
$Hasher = [Security.Cryptography.SHA256]::Create()
try {
    $Bytes = [Text.Encoding]::UTF8.GetBytes(($Signatures -join "`n"))
    $Hash = [BitConverter]::ToString($Hasher.ComputeHash($Bytes)).Replace('-', '')
    $Fingerprint = $Hash.Substring(0, 16).ToLowerInvariant()
} finally {
    $Hasher.Dispose()
}

$Lines = [Collections.Generic.List[string]]::new()
Add-Line $Lines '# Indice operativo del codigo'
Add-Line $Lines
Add-Line $Lines '> Generado automaticamente. No editar a mano.'
Add-Line $Lines '> Actualizar: powershell -ExecutionPolicy Bypass -File scripts/update-codebase-index.ps1'
Add-Line $Lines
Add-Line $Lines ("- Generado: {0} UTC" -f (Get-Date).ToUniversalTime().ToString('yyyy-MM-dd HH:mm:ss'))
Add-Line $Lines ("- Huella del inventario: {0}" -f $Fingerprint)
Add-Line $Lines ("- Archivos indexados: {0}" -f $ProjectFiles.Count)
Add-Line $Lines '- Excluye .env, node_modules, .next, target, build, Git y artefactos temporales.'
Add-Line $Lines
Add-Line $Lines '## Uso'
Add-Line $Lines
Add-Line $Lines '1. Leer este archivo antes de explorar el repositorio.'
Add-Line $Lines '2. Ir al area indicada en la tabla de enrutamiento.'
Add-Line $Lines '3. Usar rg solo dentro del alcance relacionado con la tarea.'
Add-Line $Lines '4. Leer los documentos obligatorios y ADR aplicables; este indice no los reemplaza.'
Add-Line $Lines '5. Regenerarlo tras cambiar rutas, modulos, controladores, migraciones o scripts.'
Add-Line $Lines
Add-Line $Lines '## Arquitectura estable'
Add-Line $Lines
Add-Line $Lines '- SaaS multicomplejo y web responsive mobile-first.'
Add-Line $Lines '- Frontend Next.js, React y TypeScript.'
Add-Line $Lines '- Backend Java 21 y Spring Boot como monolito modular.'
Add-Line $Lines '- Keycloak/OIDC; Google sera un proveedor federado.'
Add-Line $Lines '- PostgreSQL y Flyway; no editar migraciones aplicadas.'
Add-Line $Lines '- Dinero en unidad minima; UTC en datos y America/Lima en presentacion.'
Add-Line $Lines '- Reservas y pagos: transaccion, idempotencia, auditoria y control de concurrencia.'
Add-Line $Lines '- Organizaciones: validar actor, pertenencia, permiso y tenant en backend.'
Add-Line $Lines
Add-Line $Lines '## Enrutamiento por tarea'
Add-Line $Lines
Add-Line $Lines '| Area | Frontend | Backend | Documentacion inicial |'
Add-Line $Lines '|---|---|---|---|'
Add-Line $Lines '| Inicio y navegacion | frontend/features/home, frontend/features/navigation | - | DESIGN.md, docs/product/24_flujos_ux.md |'
Add-Line $Lines '| Sesion y perfil | frontend/features/auth, frontend/app/perfil | identity, profiles | docs/product/10_autenticacion_autorizacion.md, docs/product/16_inicio_sesion_google.md |'
Add-Line $Lines '| Organizaciones | frontend/features/organizations, frontend/app/admin | organizations | docs/product/11_matriz_roles_permisos.md |'
Add-Line $Lines '| Complejos y canchas | frontend/features/venues | venues | docs/product/27_panel_complejos.md, docs/ITERATION_3_VENUES_PLAN.md |'
Add-Line $Lines '| Reservas | frontend/features/reservations, PublicVenueCatalog.tsx | reservations | docs/product/25_reglas_reservas.md, docs/RESERVATIONS_PAYMENTS.md |'
Add-Line $Lines '| Pagos | ReservationCheckout.tsx | payments | docs/product/32_pagos_yape_plin.md, docs/adr/ADR-005-pagos-desacoplados.md |'
Add-Line $Lines '| Partidos | frontend/features/matches, frontend/app/partidos | matches | docs/product/26_reglas_partidos.md |'
Add-Line $Lines '| Infraestructura | frontend/lib | foundation, shared | README.md, compose.yaml, docs/IDENTITY_LOCAL_SETUP.md |'
Add-Line $Lines
Add-Line $Lines '## Frontend'
Add-Line $Lines
Add-Line $Lines '### Rutas'
Add-Line $Lines
foreach ($Page in $Pages) {
    $File = Relative $Page.FullName
    $Route = $File -replace '^frontend/app', '' -replace '/page\.tsx$', ''
    if ([string]::IsNullOrEmpty($Route)) { $Route = '/' }
    Add-Line $Lines ("- {0} -> {1}" -f $Route, $File)
}
Add-Line $Lines
Add-Line $Lines '### Features y archivos'
Add-Line $Lines
foreach ($Feature in $Features) {
    $Files = @(Get-ChildItem $Feature.FullName -Recurse -File | Sort-Object FullName)
    Add-Line $Lines ("- {0} ({1}): {2}" -f $Feature.Name, $Files.Count, (($Files | ForEach-Object Name) -join ', '))
}
Add-Line $Lines
Add-Line $Lines '### Compartido'
Add-Line $Lines
Add-Line $Lines '- frontend/lib/api.ts: cliente HTTP y errores.'
Add-Line $Lines '- frontend/lib/oidc.ts: cliente OIDC.'
Add-Line $Lines '- frontend/lib/auth-session.ts: sesion.'
Add-Line $Lines '- frontend/app/styles.css: estilos globales y responsive.'
Add-Line $Lines '- frontend/AGENTS.md: reglas de la version instalada de Next.js.'
Add-Line $Lines
Add-Line $Lines '## Backend'
Add-Line $Lines
Add-Line $Lines '### Modulos'
Add-Line $Lines
foreach ($Module in $Modules) {
    $MainCount = @(Get-ChildItem $Module.FullName -Recurse -Filter '*.java').Count
    $TestPath = "$ProjectRoot\backend\src\test\java\com\pulsopiura\platform\$($Module.Name)"
    $TestCount = if (Test-Path $TestPath) { @(Get-ChildItem $TestPath -Recurse -Filter '*.java').Count } else { 0 }
    Add-Line $Lines ("- {0}: {1} clases, {2} pruebas." -f $Module.Name, $MainCount, $TestCount)
}
Add-Line $Lines
Add-Line $Lines '### Controladores y endpoints declarados'
Add-Line $Lines
foreach ($Controller in $Controllers) {
    $BaseMatch = Select-String $Controller.FullName -Pattern '@RequestMapping\("([^"]+)' | Select-Object -First 1
    $Base = if ($BaseMatch) { $BaseMatch.Matches[0].Groups[1].Value } else { 'sin prefijo' }
    $Methods = Select-String $Controller.FullName -Pattern '@(Get|Post|Put|Patch|Delete)Mapping(?:\("([^"]*)")?' | ForEach-Object {
        $Match = $_.Matches[0]
        $Suffix = $Match.Groups[2].Value
        if ($Suffix) { "$($Match.Groups[1].Value.ToUpperInvariant()) $Suffix" } else { $Match.Groups[1].Value.ToUpperInvariant() }
    }
    Add-Line $Lines ("- {0} | {1} | {2}" -f $Base, (Relative $Controller.FullName), ($Methods -join '; '))
}
Add-Line $Lines
Add-Line $Lines '### Migraciones Flyway'
Add-Line $Lines
foreach ($Migration in $Migrations) { Add-Line $Lines ("- {0}" -f (Relative $Migration.FullName)) }
Add-Line $Lines
Add-Line $Lines '## Operacion y validacion'
Add-Line $Lines
Add-Line $Lines '- Inicio: powershell -ExecutionPolicy Bypass -File scripts/start-local.ps1'
Add-Line $Lines '- Parada: powershell -ExecutionPolicy Bypass -File scripts/stop-local.ps1'
Add-Line $Lines '- Datos demo: powershell -ExecutionPolicy Bypass -File scripts/seed-demo-data.ps1'
foreach ($Script in $ValidationScripts) { Add-Line $Lines ("- Validacion: powershell -ExecutionPolicy Bypass -File scripts/{0}" -f $Script.Name) }
Add-Line $Lines '- Frontend: npm run typecheck, npm run lint, npm run build.'
Add-Line $Lines '- Backend: mvn test.'
Add-Line $Lines
Add-Line $Lines '## Fuentes de verdad'
Add-Line $Lines
Add-Line $Lines '1. Solicitud actual del responsable del producto.'
Add-Line $Lines '2. docs/product/09_registro_decisiones.md.'
Add-Line $Lines '3. docs/product/00_contexto_maestro_desarrollo_ia.md.'
Add-Line $Lines '4. Requisitos del modulo y ADR aplicables.'
Add-Line $Lines '5. Codigo y pruebas actuales.'

$OutputDirectory = Split-Path -Parent $OutputPath
if (-not (Test-Path $OutputDirectory)) { New-Item -ItemType Directory $OutputDirectory | Out-Null }
[IO.File]::WriteAllLines($OutputPath, $Lines, [Text.UTF8Encoding]::new($true))
Write-Output "Index updated: $OutputPath"
