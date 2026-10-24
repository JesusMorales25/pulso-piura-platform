#!/bin/sh
set -eu

# An explicit JDBC URL is portable across Supabase, Render and a self-hosted VPS.
# Keep the legacy Render URL only as a fallback during configuration transitions.
if [ -z "${DATABASE_URL:-}" ] && [ -n "${RENDER_DATABASE_URL:-}" ]; then
  database_endpoint=${RENDER_DATABASE_URL#*@}
  export DATABASE_URL="jdbc:postgresql://${database_endpoint}"
fi

if [ -n "${DATABASE_URL:-}" ]; then
  case "$DATABASE_URL" in
    jdbc:postgresql://*) ;;
    *) echo 'DATABASE_URL must use jdbc:postgresql:// with separate user/password variables.' >&2; exit 1 ;;
  esac
  case "$DATABASE_URL" in
    *@*|*password=*|*user=*)
      echo 'Keep database credentials in POSTGRES_USER / POSTGRES_PASSWORD, not DATABASE_URL.' >&2
      exit 1
      ;;
  esac
fi

exec java \
  -XX:InitialRAMPercentage="${JAVA_INITIAL_RAM_PERCENTAGE:-20.0}" \
  -XX:MaxRAMPercentage="${JAVA_MAX_RAM_PERCENTAGE:-65.0}" \
  -XX:+ExitOnOutOfMemoryError \
  -jar /app/app.jar

