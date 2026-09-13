$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
. "$PSScriptRoot\import-local-env.ps1"

Set-Location (Join-Path $projectRoot "backend")
Write-Host "Backend Pulso Piura: http://localhost:8080"
# El entorno local tiene una incidencia conocida en testCompile. Las pruebas se
# ejecutan por separado; el arranque solo necesita compilar el codigo principal.
& mvn.cmd "-Dmaven.test.skip=true" spring-boot:run
exit $LASTEXITCODE
