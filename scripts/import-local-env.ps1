param(
    [ValidateSet("keycloak", "auth0")]
    [string]$AuthProvider
)

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

$configuredProvider = if ($AuthProvider) {
    $AuthProvider.ToLowerInvariant()
} elseif ($env:AUTH_PROVIDER) {
    $env:AUTH_PROVIDER.Trim().ToLowerInvariant()
} elseif ($env:NEXT_PUBLIC_AUTH_PROVIDER) {
    $env:NEXT_PUBLIC_AUTH_PROVIDER.Trim().ToLowerInvariant()
} else {
    "keycloak"
}
if ($configuredProvider -notin @("keycloak", "auth0")) {
    throw "AUTH_PROVIDER debe ser keycloak o auth0."
}
$env:AUTH_PROVIDER = $configuredProvider
$env:NEXT_PUBLIC_AUTH_PROVIDER = $configuredProvider

if ($configuredProvider -eq "auth0") {
    $env:OIDC_ISSUER_URI = $env:AUTH0_OIDC_ISSUER_URI
    $env:OIDC_JWK_SET_URI = $env:AUTH0_OIDC_JWK_SET_URI
    $env:OIDC_AUDIENCE = $env:AUTH0_OIDC_AUDIENCE
    $env:NEXT_PUBLIC_OIDC_ISSUER = $env:AUTH0_OIDC_ISSUER_URI
    $env:NEXT_PUBLIC_OIDC_CLIENT_ID = $env:AUTH0_OIDC_CLIENT_ID
    $env:NEXT_PUBLIC_OIDC_AUDIENCE = $env:AUTH0_OIDC_AUDIENCE
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
    "NEXT_PUBLIC_API_BASE_URL",
    "WEB_ALLOWED_ORIGIN",
    "FRONTEND_PUBLIC_URL"
) | ForEach-Object { Assert-LocalHttpUrl $_ }

if ($configuredProvider -eq "keycloak") {
    @(
        "OIDC_ISSUER_URI",
        "NEXT_PUBLIC_OIDC_ISSUER",
        "KEYCLOAK_PUBLIC_URL"
    ) | ForEach-Object { Assert-LocalHttpUrl $_ }
} else {
    foreach ($name in @(
        "OIDC_ISSUER_URI",
        "OIDC_JWK_SET_URI",
        "OIDC_AUDIENCE",
        "NEXT_PUBLIC_OIDC_ISSUER",
        "NEXT_PUBLIC_OIDC_CLIENT_ID",
        "NEXT_PUBLIC_OIDC_AUDIENCE"
    )) {
        $value = [Environment]::GetEnvironmentVariable($name)
        if ([string]::IsNullOrWhiteSpace($value)) {
            throw "$name es obligatorio para iniciar localmente con Auth0."
        }
    }
    foreach ($name in @("OIDC_ISSUER_URI", "OIDC_JWK_SET_URI", "NEXT_PUBLIC_OIDC_ISSUER")) {
        $value = [Environment]::GetEnvironmentVariable($name)
        $uri = $null
        if (-not [Uri]::TryCreate($value, [UriKind]::Absolute, [ref]$uri) -or $uri.Scheme -ne "https") {
            throw "$name debe ser una URL HTTPS de Auth0."
        }
    }
    if ($env:OIDC_AUDIENCE -ne $env:NEXT_PUBLIC_OIDC_AUDIENCE) {
        throw "OIDC_AUDIENCE y NEXT_PUBLIC_OIDC_AUDIENCE deben coincidir."
    }
}

$postgresPort = if ($env:POSTGRES_PORT) { $env:POSTGRES_PORT } else { "5433" }
$env:DATABASE_URL = "jdbc:postgresql://127.0.0.1:$postgresPort/$($env:POSTGRES_DB)"
