#!/bin/sh
set -eu
root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
mkdir -p "$root/../.local"
scratch_root=$(CDPATH= cd -- "$root/../.local" && pwd)
scratch=$(mktemp -d "$scratch_root/db-config-test.XXXXXX")
cleanup() {
  case "$scratch" in
    "$scratch_root"/db-config-test.*) rm -rf -- "$scratch" ;;
    *) echo 'Refusing to remove unexpected test path' >&2 ;;
  esac
}
trap cleanup EXIT HUP INT TERM
mkdir "$scratch/bin"
cat > "$scratch/bin/java" <<'JAVA'
#!/bin/sh
printf '%s' "${DATABASE_URL:-unset}"
JAVA
chmod +x "$scratch/bin/java"
run() {
  env -u DATABASE_URL -u RENDER_DATABASE_URL PATH="$scratch/bin:$PATH" "$@" sh "$root/render-entrypoint.sh"
}
expect() {
  if [ "$1" != "$2" ]; then
    echo "FAIL: $3" >&2
    exit 1
  fi
}
expect "$(run DATABASE_URL=jdbc:postgresql://new-host:5432/postgres?sslmode=require RENDER_DATABASE_URL=postgresql://old:secret@old-host/old)" \
  'jdbc:postgresql://new-host:5432/postgres?sslmode=require' 'explicit JDBC must override legacy Render URL'
expect "$(run RENDER_DATABASE_URL=postgresql://old:secret@old-host/old?sslmode=require)" \
  'jdbc:postgresql://old-host/old?sslmode=require' 'legacy Render fallback must preserve endpoint and TLS, remove credentials'
expect "$(run)" unset 'local defaults must remain available'
if run DATABASE_URL=postgresql://wrong-format/db >"$scratch/output" 2>&1; then
  echo 'FAIL: non-JDBC URL must fail before starting Java' >&2
  exit 1
fi
if run DATABASE_URL=jdbc:postgresql://user:private-password@host/db >"$scratch/output" 2>&1; then
  echo 'FAIL: embedded credentials must be rejected' >&2
  exit 1
fi
if grep -q private-password "$scratch/output"; then
  echo 'FAIL: error must not print credentials' >&2
  exit 1
fi
echo 'PASS: database URL precedence, legacy fallback, local defaults and secret-safe validation'
