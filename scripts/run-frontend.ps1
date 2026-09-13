$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
. "$PSScriptRoot\import-local-env.ps1"

Set-Location (Join-Path $projectRoot "frontend")
Write-Host "Frontend Pulso Piura: http://localhost:3000"
& npm.cmd run dev
exit $LASTEXITCODE
