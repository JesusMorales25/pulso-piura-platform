$projectRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $projectRoot ".env"

if (-not (Test-Path -LiteralPath $envFile)) {
    throw "Falta el archivo .env en $projectRoot"
}

Get-Content -LiteralPath $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#")) {
        $separator = $line.IndexOf("=")
        if ($separator -gt 0) {
            $name = $line.Substring(0, $separator).Trim()
            $value = $line.Substring($separator + 1)
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

$postgresPort = if ($env:POSTGRES_PORT) { $env:POSTGRES_PORT } else { "5433" }
$env:DATABASE_URL = "jdbc:postgresql://127.0.0.1:$postgresPort/$($env:POSTGRES_DB)"
