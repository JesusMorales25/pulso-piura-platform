#!/usr/bin/env bash
set -euo pipefail

KCADM=/opt/keycloak/bin/kcadm.sh
export KC_OPTS="${KCADM_JAVA_OPTS:--Xms8m -Xmx64m -XX:MaxMetaspaceSize=96m -XX:+UseSerialGC}"
KEYCLOAK_INTERNAL_URL=${KEYCLOAK_INTERNAL_URL:-http://keycloak:8080}
FRONTEND_PUBLIC_URL=${FRONTEND_PUBLIC_URL:-http://localhost:3000}
FRONTEND_PUBLIC_URL=${FRONTEND_PUBLIC_URL%/}

authenticate_admin() {
  local attempt=1
  local max_attempts=${KEYCLOAK_ADMIN_MAX_ATTEMPTS:-20}
  local retry_seconds=${KEYCLOAK_ADMIN_RETRY_SECONDS:-3}
  local login_output

  while [ "$attempt" -le "$max_attempts" ]; do
    if login_output=$("$KCADM" config credentials \
      --server "$KEYCLOAK_INTERNAL_URL" \
      --realm master \
      --client admin-cli \
      --user "$KEYCLOAK_ADMIN" \
      --password "$KEYCLOAK_ADMIN_PASSWORD" 2>&1); then
      printf '%s\n' "$login_output"
      return 0
    fi

    if [ "$attempt" -eq "$max_attempts" ]; then
      printf '%s\n' "$login_output" >&2
      echo "Keycloak no aceptó la sesión administrativa después de $max_attempts intentos." >&2
      echo "Revisa que el servicio esté listo y que KEYCLOAK_ADMIN_PASSWORD corresponda al volumen actual." >&2
      return 1
    fi

    echo "Keycloak todavía no acepta sesiones administrativas; reintentando ($attempt/$max_attempts)..." >&2
    attempt=$((attempt + 1))
    sleep "$retry_seconds"
  done
}

# El puerto HTTP se abre antes de que el endpoint OIDC esté listo. El contenedor
# puede figurar saludable durante ese intervalo y kcadm recibe una respuesta no JSON.
authenticate_admin

# Los access tokens siguen siendo breves; la aplicación los renueva mientras
# la pestaña permanezca activa. La sesión expira tras 8 h inactiva o 24 h como máximo.
"$KCADM" update realms/pulso-piura \
  -s accessTokenLifespan=300 \
  -s ssoSessionIdleTimeout=28800 \
  -s ssoSessionMaxLifespan=86400 \
  -s clientSessionIdleTimeout=28800 \
  -s clientSessionMaxLifespan=86400 \
  -s loginTheme=pulso-piura \
  -s internationalizationEnabled=true \
  -s 'supportedLocales=["es"]' \
  -s defaultLocale=es >/dev/null

if [ "${LOCAL_REQUIRE_EMAIL_VERIFICATION:-false}" = "true" ]; then
  "$KCADM" update realms/pulso-piura \
    -s "registrationAllowed=${PASSWORD_REGISTRATION_ENABLED:-true}" \
    -s verifyEmail=true >/dev/null
else
  "$KCADM" update realms/pulso-piura \
    -s "registrationAllowed=${PASSWORD_REGISTRATION_ENABLED:-true}" \
    -s verifyEmail=false >/dev/null
  # El entorno local no dispone de SMTP. También repara cuentas que quedaron
  # detenidas en VERIFY_EMAIL después de un intento de registro anterior.
  "$KCADM" get users -r pulso-piura --fields id --format csv --noquotes |
    while IFS= read -r local_user_id; do
      if [ -n "$local_user_id" ]; then
        "$KCADM" update "users/$local_user_id" \
          -r pulso-piura \
          -s emailVerified=true \
          -s 'requiredActions=[]' >/dev/null
      fi
    done
fi

configure_web_client() {
  local client_uuid
  client_uuid=$("$KCADM" get clients \
    -r pulso-piura \
    -q clientId=pulso-web \
    --fields id \
    --format csv \
    --noquotes | head -n 1)
  if [ -z "$client_uuid" ]; then
    echo "No se encontró el cliente pulso-web." >&2
    exit 1
  fi

  echo "Configurando pulso-web para $FRONTEND_PUBLIC_URL"
  "$KCADM" update "clients/$client_uuid" \
    -r pulso-piura \
    -s "redirectUris=[\"$FRONTEND_PUBLIC_URL/auth/callback\"]" \
    -s "webOrigins=[\"$FRONTEND_PUBLIC_URL\"]" \
    -s "attributes={\"pkce.code.challenge.method\":\"S256\",\"post.logout.redirect.uris\":\"$FRONTEND_PUBLIC_URL/*\"}" >/dev/null
  echo "Callback de pulso-web configurado."
}

configure_web_client

configure_google_identity_provider() {
  local provider_path="identity-provider/instances/google"

  if [ "${GOOGLE_LOGIN_ENABLED:-false}" != "true" ]; then
    if "$KCADM" get "$provider_path" -r pulso-piura >/dev/null 2>&1; then
      "$KCADM" update "$provider_path" -r pulso-piura -s enabled=false >/dev/null
    fi
    echo "Inicio de sesión con Google desactivado."
    return
  fi

  if [ -z "${GOOGLE_CLIENT_ID:-}" ] || [ -z "${GOOGLE_CLIENT_SECRET:-}" ]; then
    echo "GOOGLE_LOGIN_ENABLED=true requiere GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET." >&2
    exit 1
  fi

  local provider_target="identity-provider/instances"
  local provider_exists=false
  if "$KCADM" get "$provider_path" -r pulso-piura >/dev/null 2>&1; then
    provider_exists=true
  fi

  local provider_command="create"
  if [ "$provider_exists" = "true" ]; then
    provider_command="update"
    provider_target="$provider_path"
  fi

  "$KCADM" "$provider_command" "$provider_target" \
    -r pulso-piura \
    -s alias=google \
    -s providerId=google \
    -s enabled=true \
    -s trustEmail=true \
    -s storeToken=false \
    -s addReadTokenRoleOnCreate=false \
    -s authenticateByDefault=false \
    -s linkOnly=false \
    -s updateProfileFirstLoginMode=on \
    -s 'firstBrokerLoginFlowAlias=first broker login' \
    -s "config.clientId=$GOOGLE_CLIENT_ID" \
    -s "config.clientSecret=$GOOGLE_CLIENT_SECRET" \
    -s 'config.defaultScope=openid profile email' \
    -s config.useJwksUrl=true \
    -s config.syncMode=FORCE >/dev/null

  local picture_mapper_id
  picture_mapper_id=$("$KCADM" get identity-provider/instances/google/mappers \
    -r pulso-piura \
    --fields id,name \
    --format csv \
    --noquotes | while IFS=, read -r mapper_id mapper_name; do
      if [ "$mapper_name" = "Google profile picture" ]; then
        echo "$mapper_id"
        break
      fi
    done)

  local mapper_command="create"
  local mapper_target="identity-provider/instances/google/mappers"
  if [ -n "$picture_mapper_id" ]; then
    mapper_command="update"
    mapper_target="$mapper_target/$picture_mapper_id"
  fi

  "$KCADM" "$mapper_command" "$mapper_target" \
    -r pulso-piura \
    -s 'name=Google profile picture' \
    -s identityProviderAlias=google \
    -s identityProviderMapper=oidc-user-attribute-idp-mapper \
    -s config.claim=picture \
    -s config.user.attribute=picture \
    -s config.syncMode=INHERIT >/dev/null

  echo "Inicio de sesión con Google configurado en Keycloak."
  echo "GOOGLE_REDIRECT_URI|${KEYCLOAK_PUBLIC_URL:-http://localhost:8180}/realms/pulso-piura/broker/google/endpoint"
}

ensure_realm_role() {
  local name="$1"
  local description="$2"
  if ! "$KCADM" get "roles/$name" -r pulso-piura >/dev/null 2>&1; then
    "$KCADM" create roles -r pulso-piura -s name="$name" -s description="$description" >/dev/null
  fi
}

ensure_realm_role PLATFORM_ADMIN "Administración excepcional de la plataforma"
ensure_realm_role CAPTAIN "Capitán de partidos"
ensure_realm_role TOURNAMENT_ORGANIZER "Organizador de eventos deportivos"

ensure_user() {
  local role="$1"
  local email="$2"
  local first_name="$3"
  local last_name="$4"
  local user_id
  local user_created=false

  user_id=$("$KCADM" get users \
    -r pulso-piura \
    -q username="$email" \
    --fields id \
    --format csv \
    --noquotes | head -n 1)

  if [ -z "$user_id" ]; then
    user_id=$("$KCADM" create users \
      -r pulso-piura \
      -s username="$email" \
      -s email="$email" \
      -s enabled=true \
      -s emailVerified=true \
      -s firstName="$first_name" \
      -s lastName="$last_name" \
      -i)
    user_created=true
  else
    "$KCADM" update "users/$user_id" \
      -r pulso-piura \
      -s enabled=true \
      -s emailVerified=true \
      -s 'requiredActions=[]' >/dev/null
  fi

  if [ "$user_created" = "true" ] || [ "${RESET_BOOTSTRAP_USER_PASSWORDS:-false}" = "true" ]; then
    "$KCADM" set-password \
      -r pulso-piura \
      --userid "$user_id" \
      --new-password "$TEST_USER_PASSWORD"
    "$KCADM" delete "attack-detection/brute-force/users/$user_id" \
      -r pulso-piura >/dev/null 2>&1 || true
    echo "Contraseña inicial sincronizada para $email."
  fi

  if [ "$role" = "PLATFORM_ADMIN" ]; then
    "$KCADM" add-roles \
      -r pulso-piura \
      --uusername "$email" \
      --rolename PLATFORM_ADMIN
  fi

  if [ "$role" = "ORGANIZER" ]; then
    "$KCADM" add-roles -r pulso-piura --uusername "$email" --rolename CAPTAIN
    "$KCADM" add-roles -r pulso-piura --uusername "$email" --rolename TOURNAMENT_ORGANIZER
  fi

  echo "DEMO_ID|$role|$email|$user_id"
}

ensure_user PLATFORM_ADMIN "$DEMO_PLATFORM_ADMIN_EMAIL" Plataforma Admin

if [ "${LOCAL_DEMO_USERS_ENABLED:-false}" = "true" ]; then
  ensure_user PLAYER "$TEST_USER_EMAIL" Jugador Local
  ensure_user ORGANIZER "$DEMO_ORGANIZER_EMAIL" Organizador Demo
  ensure_user OWNER "$DEMO_OWNER_EMAIL" Propietario Demo
  ensure_user ADMIN "$DEMO_ADMIN_EMAIL" Administrador Demo
  ensure_user OPERATOR "$DEMO_OPERATOR_EMAIL" Operador Demo
else
  echo "Usuarios adicionales de demostración desactivados."
fi

configure_google_identity_provider

echo "Identidades locales preparadas."
