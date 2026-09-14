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

function Assert-LocalHttpUrl {
    param([string]$Name)

    $value = [Environment]::GetEnvironmentVariable($Name)
    if ([string]::IsNullOrWhiteSpace($value)) { return }

    $uri = $null
    if (-not [Uri]::TryCreate($value, [UriKind]::Absolute, [ref]$uri) -or
        $uri.Host -notin @("localhost", "127.0.0.1")) {
        throw "$Name debe apuntar a localhost en .env para el entorno local. Las URLs publicas pertenecen a la configuracion de Oracle/Coolify."
    }
}

@(
    "OIDC_ISSUER_URI",
    "NEXT_PUBLIC_API_BASE_URL",
    "NEXT_PUBLIC_OIDC_ISSUER",
    "WEB_ALLOWED_ORIGIN",
    "KEYCLOAK_PUBLIC_URL",
    "FRONTEND_PUBLIC_URL"
) | ForEach-Object { Assert-LocalHttpUrl $_ }

$postgresPort = if ($env:POSTGRES_PORT) { $env:POSTGRES_PORT } else { "5433" }
$env:DATABASE_URL = "jdbc:postgresql://127.0.0.1:$postgresPort/$($env:POSTGRES_DB)"
