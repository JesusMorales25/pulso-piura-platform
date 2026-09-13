param([switch]$Apply)
$ErrorActionPreference = "Stop"
. "$PSScriptRoot/import-local-env.ps1"
# Local-only administration: never print credentials, tokens, or raw identity events.
$base = "http://localhost:8180"
$headers = $null
$token = $null
try {
    $token = Invoke-RestMethod -Method Post -Uri "$base/realms/master/protocol/openid-connect/token" -Body @{
        grant_type = "password"; client_id = "admin-cli"
        username = $env:KEYCLOAK_ADMIN; password = $env:KEYCLOAK_ADMIN_PASSWORD
    }
    $headers = @{ Authorization = "Bearer $($token.access_token)" }
    if ($Apply) {
        $policy = Get-Content "$PSScriptRoot/../infra/keycloak/security-policy.json" -Raw
        Invoke-RestMethod -Method Put -Uri "$base/admin/realms/pulso-piura" -Headers $headers -ContentType "application/json" -Body $policy | Out-Null
    }
    $realm = Invoke-RestMethod -Uri "$base/admin/realms/pulso-piura" -Headers $headers
    $since = [DateTimeOffset]::UtcNow.AddHours(-24).ToUnixTimeMilliseconds()
    $events = @(Invoke-RestMethod -Uri "$base/admin/realms/pulso-piura/events?max=1000&direction=desc" -Headers $headers)
    $recent = @($events | Where-Object { $_.time -ge $since })
    [ordered]@{
        checkedAt = [DateTimeOffset]::UtcNow.ToString("o")
        bruteForceProtected = $realm.bruteForceProtected
        permanentLockout = $realm.permanentLockout
        failureFactor = $realm.failureFactor
        eventsEnabled = $realm.eventsEnabled
        retentionSeconds = $realm.eventsExpiration
        adminEventsEnabled = $realm.adminEventsEnabled
        recentEvents = $recent.Count
        loginErrors = @($recent | Where-Object type -eq 'LOGIN_ERROR').Count
        temporaryLockouts = @($recent | Where-Object type -eq 'USER_DISABLED_BY_TEMPORARY_LOCKOUT').Count
        sampleMayBeTruncated = $events.Count -ge 1000
    } | ConvertTo-Json
} catch {
    throw "No se pudo verificar la seguridad de Keycloak. Revisa disponibilidad y credenciales administrativas locales."
} finally { $headers = $null; $token = $null }
