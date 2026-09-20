$ErrorActionPreference = "Stop"

$keycloakUrl = "http://localhost:8180"
$realmName = "pulso-piura"
$script:accessToken = $null

function Assert-EnvironmentValue {
    param([string]$Name)
    $value = [Environment]::GetEnvironmentVariable($Name)
    if ([string]::IsNullOrWhiteSpace($value)) {
        throw "Falta la variable local $Name."
    }
    return $value
}

function Set-JsonProperty {
    param(
        [Parameter(Mandatory = $true)]$InputObject,
        [Parameter(Mandatory = $true)][string]$Name,
        $Value
    )
    if ($null -ne $InputObject.PSObject.Properties[$Name]) {
        $InputObject.PSObject.Properties[$Name].Value = $Value
    } else {
        $InputObject | Add-Member -NotePropertyName $Name -NotePropertyValue $Value -Force
    }
}

function Get-KeycloakToken {
    $adminUser = Assert-EnvironmentValue "KEYCLOAK_ADMIN"
    $adminPassword = Assert-EnvironmentValue "KEYCLOAK_ADMIN_PASSWORD"
    $maxAttempts = 20
    for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
        try {
            $response = Invoke-RestMethod `
                -Method Post `
                -Uri "$keycloakUrl/realms/master/protocol/openid-connect/token" `
                -ContentType "application/x-www-form-urlencoded" `
                -Body @{
                    client_id  = "admin-cli"
                    username   = $adminUser
                    password   = $adminPassword
                    grant_type = "password"
                } `
                -TimeoutSec 10
            $script:accessToken = $response.access_token
            return
        } catch {
            $statusCode = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { $null }
            if ($statusCode -eq 400 -or $statusCode -eq 401) {
                throw "Keycloak rechazo las credenciales administrativas configuradas en .env."
            }
            if ($attempt -eq $maxAttempts) { throw }
            Start-Sleep -Seconds 3
        }
    }
}

function Invoke-KeycloakAdmin {
    param(
        [Parameter(Mandatory = $true)][ValidateSet("GET", "POST", "PUT", "DELETE")][string]$Method,
        [Parameter(Mandatory = $true)][string]$Path,
        $Body,
        [switch]$BodyAsArray,
        [switch]$AllowNotFound,
        [switch]$Retrying
    )

    if ([string]::IsNullOrWhiteSpace($script:accessToken)) {
        Get-KeycloakToken
    }

    $request = @{
        Method      = $Method
        Uri         = "$keycloakUrl$Path"
        Headers     = @{ Authorization = "Bearer $script:accessToken" }
        TimeoutSec  = 20
        ErrorAction = "Stop"
    }
    if ($null -ne $Body) {
        $request.ContentType = "application/json; charset=utf-8"
        $jsonBody = ConvertTo-Json -InputObject $Body -Depth 40 -Compress
        if ($BodyAsArray) {
            # Windows PowerShell 5.1 aplana los arreglos de un solo elemento
            # incluso con -InputObject. Este endpoint de Keycloak exige []
            # también al asignar un único rol.
            $jsonBody = "[$jsonBody]"
        }
        # Windows PowerShell 5.1 puede codificar un string HTTP con la página
        # de códigos del sistema aunque el contenido sea JSON. Eso rompe el
        # payload cuando un usuario federado contiene tildes u otros caracteres
        # Unicode. Enviar bytes UTF-8 evita que Keycloak reciba JSON inválido.
        $request.Body = [System.Text.Encoding]::UTF8.GetBytes($jsonBody)
    }

    try {
        $response = Invoke-RestMethod @request
        if ($response -is [System.Array]) {
            foreach ($item in $response) {
                Write-Output $item
            }
        } elseif ($null -ne $response) {
            Write-Output $response
        }
        return
    } catch {
        $statusCode = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { $null }
        if ($AllowNotFound -and $statusCode -eq 404) {
            return $null
        }
        if (-not $Retrying -and $statusCode -eq 401) {
            Get-KeycloakToken
            return Invoke-KeycloakAdmin -Method $Method -Path $Path -Body $Body -BodyAsArray:$BodyAsArray -AllowNotFound:$AllowNotFound -Retrying
        }
        $statusText = if ($null -ne $statusCode) { "HTTP $statusCode" } else { "sin codigo HTTP" }
        $serverDetail = $_.ErrorDetails.Message
        if ([string]::IsNullOrWhiteSpace($serverDetail)) { $serverDetail = $_.Exception.Message }
        throw "Keycloak $Method $Path fallo ($statusText): $serverDetail"
    }
}

function Get-BooleanEnvironmentValue {
    param([string]$Name, [bool]$Default)
    $value = [Environment]::GetEnvironmentVariable($Name)
    if ([string]::IsNullOrWhiteSpace($value)) { return $Default }
    return $value.Equals("true", [System.StringComparison]::OrdinalIgnoreCase)
}

function Get-EnvironmentValueOrDefault {
    param([string]$Name, [string]$Default)
    $value = [Environment]::GetEnvironmentVariable($Name)
    if ([string]::IsNullOrWhiteSpace($value)) { return $Default }
    return $value
}

function Update-RealmConfiguration {
    $realm = Invoke-KeycloakAdmin -Method GET -Path "/admin/realms/$realmName"
    Set-JsonProperty $realm "accessTokenLifespan" 300
    Set-JsonProperty $realm "ssoSessionIdleTimeout" 28800
    Set-JsonProperty $realm "ssoSessionMaxLifespan" 86400
    Set-JsonProperty $realm "clientSessionIdleTimeout" 28800
    Set-JsonProperty $realm "clientSessionMaxLifespan" 86400
    Set-JsonProperty $realm "loginTheme" "pulso-piura"
    Set-JsonProperty $realm "internationalizationEnabled" $true
    Set-JsonProperty $realm "supportedLocales" @("es")
    Set-JsonProperty $realm "defaultLocale" "es"
    Set-JsonProperty $realm "registrationAllowed" (Get-BooleanEnvironmentValue "PASSWORD_REGISTRATION_ENABLED" $true)

    $verifyEmail = Get-BooleanEnvironmentValue "LOCAL_REQUIRE_EMAIL_VERIFICATION" $false
    Set-JsonProperty $realm "verifyEmail" $verifyEmail
    Invoke-KeycloakAdmin -Method PUT -Path "/admin/realms/$realmName" -Body $realm | Out-Null

    if (-not $verifyEmail) {
        $users = @(Invoke-KeycloakAdmin -Method GET -Path "/admin/realms/$realmName/users?first=0&max=500")
        foreach ($user in $users) {
            # Keycloak acepta actualizaciones parciales. No se reenvía la
            # representación completa porque puede incluir atributos federados,
            # credenciales y campos de solo lectura que este paso no modifica.
            Invoke-KeycloakAdmin -Method PUT -Path "/admin/realms/$realmName/users/$($user.id)" -Body @{
                emailVerified  = $true
                requiredActions = @()
            } | Out-Null
        }
    }
}

function Update-WebClient {
    $clients = @(Invoke-KeycloakAdmin -Method GET -Path "/admin/realms/$realmName/clients?clientId=pulso-web")
    $client = $clients | Where-Object { $_.clientId -eq "pulso-web" } | Select-Object -First 1
    if (-not $client) { throw "No se encontro el cliente pulso-web." }

    $frontendUrl = [Environment]::GetEnvironmentVariable("FRONTEND_PUBLIC_URL")
    if ([string]::IsNullOrWhiteSpace($frontendUrl)) { $frontendUrl = "http://localhost:3000" }
    $frontendUrl = $frontendUrl.TrimEnd("/")

    Set-JsonProperty $client "redirectUris" @("$frontendUrl/auth/callback")
    Set-JsonProperty $client "webOrigins" @($frontendUrl)
    if (-not $client.attributes) { Set-JsonProperty $client "attributes" ([pscustomobject]@{}) }
    Set-JsonProperty $client.attributes "pkce.code.challenge.method" "S256"
    Set-JsonProperty $client.attributes "post.logout.redirect.uris" "$frontendUrl/*"
    Invoke-KeycloakAdmin -Method PUT -Path "/admin/realms/$realmName/clients/$($client.id)" -Body $client | Out-Null
}

function Update-GoogleProvider {
    $providerPath = "/admin/realms/$realmName/identity-provider/instances/google"
    $provider = Invoke-KeycloakAdmin -Method GET -Path $providerPath -AllowNotFound
    $googleEnabled = Get-BooleanEnvironmentValue "GOOGLE_LOGIN_ENABLED" $false

    if (-not $googleEnabled) {
        if ($provider) {
            Set-JsonProperty $provider "enabled" $false
            Invoke-KeycloakAdmin -Method PUT -Path $providerPath -Body $provider | Out-Null
        }
        Write-Host "Inicio de sesion con Google desactivado."
        return
    }

    $clientId = Assert-EnvironmentValue "GOOGLE_CLIENT_ID"
    $clientSecret = Assert-EnvironmentValue "GOOGLE_CLIENT_SECRET"
    $representation = [pscustomobject]@{
        alias                       = "google"
        providerId                  = "google"
        enabled                     = $true
        trustEmail                  = $true
        storeToken                  = $false
        addReadTokenRoleOnCreate    = $false
        authenticateByDefault       = $false
        linkOnly                    = $false
        updateProfileFirstLoginMode = "on"
        firstBrokerLoginFlowAlias   = "first broker login"
        config                      = [pscustomobject]@{
            clientId     = $clientId
            clientSecret = $clientSecret
            defaultScope = "openid profile email"
            useJwksUrl    = "true"
            syncMode      = "FORCE"
        }
    }
    if ($provider) {
        Invoke-KeycloakAdmin -Method PUT -Path $providerPath -Body $representation | Out-Null
    } else {
        Invoke-KeycloakAdmin -Method POST -Path "/admin/realms/$realmName/identity-provider/instances" -Body $representation | Out-Null
    }

    $mappers = @(Invoke-KeycloakAdmin -Method GET -Path "$providerPath/mappers")
    $mapper = $mappers | Where-Object { $_.name -eq "Google profile picture" } | Select-Object -First 1
    $mapperRepresentation = [pscustomobject]@{
        name                   = "Google profile picture"
        identityProviderAlias  = "google"
        identityProviderMapper = "oidc-user-attribute-idp-mapper"
        config                 = [pscustomobject]@{
            claim            = "picture"
            "user.attribute" = "picture"
            syncMode         = "INHERIT"
        }
    }
    $mapperIsCurrent = $mapper `
        -and $mapper.identityProviderAlias -eq "google" `
        -and $mapper.identityProviderMapper -eq "oidc-user-attribute-idp-mapper" `
        -and $mapper.config.claim -eq "picture" `
        -and $mapper.config."user.attribute" -eq "picture" `
        -and $mapper.config.syncMode -eq "INHERIT"
    if (-not $mapperIsCurrent) {
        if ($mapper) {
            Invoke-KeycloakAdmin -Method DELETE -Path "$providerPath/mappers/$($mapper.id)" | Out-Null
        }
        Invoke-KeycloakAdmin -Method POST -Path "$providerPath/mappers" -Body $mapperRepresentation | Out-Null
    }

    $publicUrl = [Environment]::GetEnvironmentVariable("KEYCLOAK_PUBLIC_URL")
    if ([string]::IsNullOrWhiteSpace($publicUrl)) { $publicUrl = "http://localhost:8180" }
    Write-Host "Inicio de sesion con Google configurado en Keycloak."
    Write-Host "GOOGLE_REDIRECT_URI|$($publicUrl.TrimEnd('/'))/realms/$realmName/broker/google/endpoint"
}

function Ensure-RealmRole {
    param([string]$Name, [string]$Description)
    $encodedName = [Uri]::EscapeDataString($Name)
    $role = Invoke-KeycloakAdmin -Method GET -Path "/admin/realms/$realmName/roles/$encodedName" -AllowNotFound
    if (-not $role) {
        Invoke-KeycloakAdmin -Method POST -Path "/admin/realms/$realmName/roles" -Body @{
            name        = $Name
            description = $Description
        } | Out-Null
    }
}

function Ensure-User {
    param(
        [string]$Role,
        [string]$Email,
        [string]$FirstName,
        [string]$LastName
    )
    if ([string]::IsNullOrWhiteSpace($Email)) { throw "Falta el correo para el rol $Role." }
    $encodedEmail = [Uri]::EscapeDataString($Email)
    $users = @(Invoke-KeycloakAdmin -Method GET -Path "/admin/realms/$realmName/users?username=$encodedEmail&exact=true")
    $user = $users | Where-Object { $_.username -eq $Email } | Select-Object -First 1
    $created = $false
    if (-not $user) {
        Invoke-KeycloakAdmin -Method POST -Path "/admin/realms/$realmName/users" -Body @{
            username      = $Email
            email         = $Email
            enabled       = $true
            emailVerified = $true
            firstName     = $FirstName
            lastName      = $LastName
        } | Out-Null
        $users = @(Invoke-KeycloakAdmin -Method GET -Path "/admin/realms/$realmName/users?username=$encodedEmail&exact=true")
        $user = $users | Where-Object { $_.username -eq $Email } | Select-Object -First 1
        $created = $true
    }
    if (-not $user) { throw "Keycloak no devolvio el usuario $Email despues de crearlo." }

    if ($created -or (Get-BooleanEnvironmentValue "RESET_BOOTSTRAP_USER_PASSWORDS" $true)) {
        $password = Assert-EnvironmentValue "TEST_USER_PASSWORD"
        Invoke-KeycloakAdmin -Method PUT -Path "/admin/realms/$realmName/users/$($user.id)/reset-password" -Body @{
            type      = "password"
            value     = $password
            temporary = $false
        } | Out-Null
    }

    $roles = switch ($Role) {
        "PLATFORM_ADMIN" { @("PLATFORM_ADMIN") }
        "ORGANIZER" { @("CAPTAIN", "TOURNAMENT_ORGANIZER") }
        default { @() }
    }
    foreach ($roleName in $roles) {
        $encodedRole = [Uri]::EscapeDataString($roleName)
        $roleRepresentation = Invoke-KeycloakAdmin -Method GET -Path "/admin/realms/$realmName/roles/$encodedRole"
        $assignedRoles = @(Invoke-KeycloakAdmin -Method GET -Path "/admin/realms/$realmName/users/$($user.id)/role-mappings/realm")
        if ($assignedRoles.name -notcontains $roleName) {
            Invoke-KeycloakAdmin -Method POST -Path "/admin/realms/$realmName/users/$($user.id)/role-mappings/realm" -Body $roleRepresentation -BodyAsArray | Out-Null
        }
    }

    Write-Output "DEMO_ID|$Role|$Email|$($user.id)"
}

Get-KeycloakToken
Update-RealmConfiguration
Update-WebClient
Update-GoogleProvider

Ensure-RealmRole "PLATFORM_ADMIN" "Administracion excepcional de la plataforma"
Ensure-RealmRole "CAPTAIN" "Capitan de partidos"
Ensure-RealmRole "TOURNAMENT_ORGANIZER" "Organizador de eventos deportivos"

Ensure-User "PLATFORM_ADMIN" `
    (Get-EnvironmentValueOrDefault "DEMO_PLATFORM_ADMIN_EMAIL" "admin.plataforma.local@pulsopiura.test") `
    "Plataforma" "Admin"

if (Get-BooleanEnvironmentValue "LOCAL_DEMO_USERS_ENABLED" $false) {
    Ensure-User "PLAYER" (Assert-EnvironmentValue "TEST_USER_EMAIL") "Jugador" "Local"
    Ensure-User "ORGANIZER" (Get-EnvironmentValueOrDefault "DEMO_ORGANIZER_EMAIL" "organizador.local@pulsopiura.test") "Organizador" "Demo"
    Ensure-User "OWNER" (Get-EnvironmentValueOrDefault "DEMO_OWNER_EMAIL" "propietario.local@pulsopiura.test") "Propietario" "Demo"
    Ensure-User "ADMIN" (Get-EnvironmentValueOrDefault "DEMO_ADMIN_EMAIL" "admin.organizacion.local@pulsopiura.test") "Administrador" "Demo"
    Ensure-User "OPERATOR" (Get-EnvironmentValueOrDefault "DEMO_OPERATOR_EMAIL" "operador.local@pulsopiura.test") "Operador" "Demo"
} else {
    Write-Host "Usuarios adicionales de demostracion desactivados."
}

Write-Host "Identidades locales preparadas."
