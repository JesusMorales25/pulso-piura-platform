$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$stateFile = Join-Path $projectRoot ".local\processes.json"

if (-not (Test-Path $stateFile)) {
    throw "No existe .local\processes.json. Inicia el entorno con scripts\start-local.ps1."
}

$state = Get-Content -Raw $stateFile | ConvertFrom-Json
if ($state.frontendPid) {
    & taskkill.exe /PID $state.frontendPid /T /F 2>$null | Out-Null
}

$deadline = (Get-Date).AddSeconds(15)
while ((Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue) -and (Get-Date) -lt $deadline) {
    Start-Sleep -Milliseconds 250
}
if (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue) {
    throw "El puerto 3000 sigue ocupado. Revisa el proceso antes de reiniciar el frontend."
}

. "$PSScriptRoot\import-local-env.ps1"
$npm = (Get-Command "npm.cmd" -ErrorAction Stop).Source
$frontend = Start-Process -FilePath $npm -ArgumentList "run","dev" -WorkingDirectory "$projectRoot\frontend" -WindowStyle Hidden -RedirectStandardOutput "$projectRoot\.local\frontend.out.log" -RedirectStandardError "$projectRoot\.local\frontend.err.log" -PassThru

$state.frontendPid = $frontend.Id
$state.startedAt = (Get-Date).ToString("o")
$state | ConvertTo-Json | Set-Content $stateFile

$deadline = (Get-Date).AddSeconds(60)
do {
    $frontend.Refresh()
    if ($frontend.HasExited) {
        if (Test-Path "$projectRoot\.local\frontend.out.log") { Get-Content "$projectRoot\.local\frontend.out.log" -Tail 80 }
        if (Test-Path "$projectRoot\.local\frontend.err.log") { Get-Content "$projectRoot\.local\frontend.err.log" -Tail 80 }
        throw "El frontend terminó durante el reinicio."
    }
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/auth/callback" -UseBasicParsing -TimeoutSec 3
        if ($response.StatusCode -eq 200) {
            Write-Host "Frontend reiniciado. La ruta /auth/callback responde correctamente."
            exit 0
        }
    } catch {
        Start-Sleep -Seconds 1
    }
} while ((Get-Date) -lt $deadline)

throw "El frontend no respondió después del reinicio."
