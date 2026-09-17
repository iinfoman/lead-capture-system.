#!/usr/bin/env bash
#
# Verifies the migrations and, most importantly, that one tenant can never see
# another's leads. Runs against a throwaway local Postgres — it never touches
# the shared Ovibe project.
#
# Usage:  ./supabase/tests/run.sh
# Needs:  postgresql (initdb, pg_ctl, psql) on PATH, or /usr/lib/postgresql/*/bin
#
set -euo pipefail

PGDATA="${PGDATA:-/var/tmp/leadcapture-test-pg}"
PGPORT="${PGPORT:-55432}"
PGHOST=/var/tmp
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

for d in /usr/lib/postgresql/*/bin; do [ -d "$d" ] && PATH="$d:$PATH"; done
export PATH PGHOST

# initdb refuses to run as root, so drop to the postgres user when we are root.
if [ "$(id -u)" -eq 0 ]; then
  run_pg() { su postgres -c "PATH=$PATH $*"; }
else
  run_pg() { eval "$@"; }
fi

# Stop as the same user that started it, and clear the socket a hard-killed
# server can leave behind — otherwise the next run fails on a stale lock file.
cleanup() {
  run_pg "pg_ctl -D $PGDATA stop -m immediate" >/dev/null 2>&1 || true
  rm -f "$PGHOST/.s.PGSQL.$PGPORT" "$PGHOST/.s.PGSQL.$PGPORT.lock" 2>/dev/null || true
}
trap cleanup EXIT
cleanup

echo "==> starting a throwaway postgres in $PGDATA"
rm -rf "$PGDATA"; mkdir -p "$PGDATA"
if [ "$(id -u)" -eq 0 ]; then chown postgres:postgres "$PGDATA"; chmod 700 "$PGDATA"; fi

run_pg "initdb -D $PGDATA -A trust -U postgres" >/dev/null
run_pg "pg_ctl -D $PGDATA -o '-k $PGHOST -p $PGPORT -c listen_addresses=' -l $PGDATA/server.log start" >/dev/null
sleep 1

psql_run() { psql -h "$PGHOST" -p "$PGPORT" -U postgres -v ON_ERROR_STOP=1 -q "$@"; }

echo "==> creating local stand-ins for auth.* and storage.*"
psql_run -f "$ROOT/supabase/tests/00_local_stubs.sql"

# "already exists / skipping" notices are the point of the idempotent DDL, so
# they are hidden unless psql actually fails.
apply_all() {
  local log
  log=$(mktemp)
  for f in "$ROOT"/supabase/migrations/*.sql; do
    if ! psql_run -f "$f" >"$log" 2>&1; then
      cat "$log"; rm -f "$log"; return 1
    fi
    [ "${1:-}" = "verbose" ] && echo "    applied $(basename "$f")"
  done
  rm -f "$log"
}

echo "==> applying migrations"
apply_all verbose

echo "==> re-applying migrations (they must be idempotent)"
apply_all
echo "    re-apply clean"

echo "==> running isolation tests"
psql_run -f "$ROOT/supabase/tests/10_isolation_test.sql" 2>&1 \
  | grep -E "PASS|FAIL|=====|ALL " \
  | sed -E 's/^psql:[^ ]+ //; s/^NOTICE:  //'

# Runs last: it deliberately removes the anon insert path, so nothing after it
# would see the pre-hardening state.
echo "==> verifying the post-deploy hardening script"
psql_run -v harden_file="$ROOT/supabase/manual/harden_after_edge_function_deploy.sql" \
  -f "$ROOT/supabase/tests/20_hardening_test.sql" 2>&1 \
  | grep -E "PASS|FAIL|=====|VERIFIED" \
  | sed -E 's/^psql:[^ ]+ //; s/^NOTICE:  //'
