#!/bin/sh
set -eu

if [ -n "${RENDER_DATABASE_URL:-}" ]; then
  database_endpoint=${RENDER_DATABASE_URL#*@}
  export DATABASE_URL="jdbc:postgresql://${database_endpoint}"
fi

exec java \
  -XX:InitialRAMPercentage="${JAVA_INITIAL_RAM_PERCENTAGE:-20.0}" \
  -XX:MaxRAMPercentage="${JAVA_MAX_RAM_PERCENTAGE:-65.0}" \
  -XX:+ExitOnOutOfMemoryError \
  -jar /app/app.jar

