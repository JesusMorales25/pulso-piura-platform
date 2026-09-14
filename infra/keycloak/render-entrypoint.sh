#!/usr/bin/env bash
set -Eeuo pipefail

if [ -z "${RENDER_DATABASE_URL:-}" ]; then
  echo "Falta RENDER_DATABASE_URL." >&2
  exit 1
fi

render_port=${PORT:-10000}
database_endpoint=${RENDER_DATABASE_URL#*@}
export KC_DB_URL="jdbc:postgresql://${database_endpoint}"
export KC_HTTP_HOST=0.0.0.0
export KC_HTTP_PORT="$render_port"
export KEYCLOAK_INTERNAL_URL="http://127.0.0.1:${render_port}"
export KEYCLOAK_ADMIN="${KC_BOOTSTRAP_ADMIN_USERNAME:?}"
export KEYCLOAK_ADMIN_PASSWORD="${KC_BOOTSTRAP_ADMIN_PASSWORD:?}"

keycloak_pid=$$
bootstrap_after_start() {
  if /opt/keycloak/bootstrap/bootstrap.sh; then
    echo "Configuración administrativa de Keycloak completada."
    return 0
  fi

  echo "No se pudo completar la configuración administrativa de Keycloak." >&2
  kill -TERM "$keycloak_pid" 2>/dev/null || true
}

bootstrap_after_start &
exec /opt/keycloak/bin/kc.sh start --optimized --import-realm
