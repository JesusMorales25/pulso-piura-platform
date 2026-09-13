#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ENV_FILE=${1:-"$SCRIPT_DIR/.env.production"}
BACKUP_DIR="$SCRIPT_DIR/backups"
STAMP=$(date -u +%Y%m%dT%H%M%SZ)

if [ ! -f "$ENV_FILE" ]; then
  echo "No existe el archivo de entorno: $ENV_FILE" >&2
  exit 1
fi

set -a
. "$ENV_FILE"
set +a
umask 077
mkdir -p "$BACKUP_DIR"

compose() {
  docker compose --env-file "$ENV_FILE" -f "$SCRIPT_DIR/compose.production.yaml" "$@"
}

compose exec -T app-db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc \
  > "$BACKUP_DIR/app-$STAMP.dump"
compose exec -T identity-db pg_dump -U "$KEYCLOAK_DB_USER" -d "$KEYCLOAK_DB" -Fc \
  > "$BACKUP_DIR/identity-$STAMP.dump"
sha256sum "$BACKUP_DIR/app-$STAMP.dump" "$BACKUP_DIR/identity-$STAMP.dump" \
  > "$BACKUP_DIR/checksums-$STAMP.sha256"

find "$BACKUP_DIR" -type f -mtime +7 -delete
echo "Backups creados en $BACKUP_DIR. Cópialos ahora a un destino cifrado fuera de la VM."
