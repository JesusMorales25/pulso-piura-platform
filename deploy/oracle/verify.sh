#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ENV_FILE=${1:-"$SCRIPT_DIR/.env.production"}

set -a
. "$ENV_FILE"
set +a

docker compose --env-file "$ENV_FILE" -f "$SCRIPT_DIR/compose.production.yaml" ps
curl --fail --silent --show-error "https://$APP_DOMAIN/" >/dev/null
curl --fail --silent --show-error \
  "https://$AUTH_DOMAIN/realms/pulso-piura/.well-known/openid-configuration" >/dev/null
echo "Frontend y emisor OIDC responden por HTTPS."
