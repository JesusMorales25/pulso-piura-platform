$projectRoot = Split-Path -Parent $PSScriptRoot
$stateFile = "$projectRoot\.local\processes.json"

function Stop-ProjectListener {
    param([int]$Port)
    $listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    foreach ($processId in @($listeners | Select-Object -ExpandProperty OwningProcess -Unique)) {
        $process = Get-CimInstance Win32_Process -Filter "ProcessId = $processId" -ErrorAction SilentlyContinue
        $belongsToProject = $process -and $process.CommandLine -like "*$projectRoot*"
        if (-not $belongsToProject -and $Port -eq 8080) {
            try {
                $health = Invoke-RestMethod -Uri "http://127.0.0.1:8080/api/v1/health" -TimeoutSec 2
                $belongsToProject = $health.service -eq "pulso-piura-api"
            } catch {
                $belongsToProject = $false
            }
        }
        if ($belongsToProject) {
            & taskkill.exe /PID $processId /T /F 2>$null | Out-Null
        } elseif ($processId) {
            Write-Warning "No se detuvo el PID $processId del puerto $Port porque no pertenece a este proyecto."
        }
    }
}

if (Test-Path $stateFile) {
    $state = Get-Content -Raw $stateFile | ConvertFrom-Json
    foreach ($processId in @($state.backendPid, $state.frontendPid, $state.shareGatewayPid)) {
        if ($processId) {
            # Maven y npm crean procesos hijos; detener solo el padre deja Java/Node activos.
            & taskkill.exe /PID $processId /T /F 2>$null | Out-Null
        }
    }
}
Stop-ProjectListener -Port 8080
Stop-ProjectListener -Port 3000
Stop-ProjectListener -Port 9000
if (Get-Command docker -ErrorAction SilentlyContinue) { Set-Location $projectRoot; docker compose down --remove-orphans }
Write-Host "Servicios locales detenidos."
