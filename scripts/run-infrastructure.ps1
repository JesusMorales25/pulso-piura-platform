$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker CLI no esta disponible en PATH. Reinicia VS Code despues de instalar Docker Desktop."
}

docker info *> $null
if ($LASTEXITCODE -ne 0) {
    throw "Docker Desktop no esta listo. Abre Docker Desktop y espera a que el motor termine de iniciar."
}

if (-not (Test-Path ".env")) {
    throw "Falta .env. Copia .env.example y configura las credenciales locales."
}

Write-Host "Iniciando PostgreSQL y Keycloak..."
docker compose up -d --wait postgres keycloak
if ($LASTEXITCODE -ne 0) {
    Write-Host "Ultimos eventos de Keycloak:"
    docker compose logs keycloak --tail 160
    throw "La infraestructura no alcanzo un estado saludable. Revisa el log anterior."
}

Write-Host "Preparando usuario local de Keycloak..."
docker compose --profile bootstrap run --rm keycloak-bootstrap
if ($LASTEXITCODE -ne 0) {
    docker compose logs keycloak --tail 160
    throw "Keycloak inicio, pero no se pudo preparar el usuario local."
}

docker compose ps
Write-Host "Infraestructura lista: PostgreSQL localhost:5433, Keycloak http://localhost:8180"
