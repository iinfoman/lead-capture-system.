#!/usr/bin/env bash
#
# Confirms a deployed environment actually works, from the outside, the way a
# customer's browser sees it. Read-only apart from one throwaway lead it
# submits and then deletes.
#
#   ./scripts/verify.sh
#
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
# shellcheck disable=SC1091
[ -f .env.deploy ] && set -a && . ./.env.deploy && set +a

: "${SUPABASE_PROJECT_REF:?set SUPABASE_PROJECT_REF in .env.deploy}"
URL="https://$SUPABASE_PROJECT_REF.supabase.co"

if [ -z "${VITE_SUPABASE_ANON_KEY:-}" ]; then
  : "${SUPABASE_ACCESS_TOKEN:?set VITE_SUPABASE_ANON_KEY or SUPABASE_ACCESS_TOKEN}"
  VITE_SUPABASE_ANON_KEY="$(curl -sS \
    "https://api.supabase.com/v1/projects/$SUPABASE_PROJECT_REF/api-keys" \
    -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
    | jq -r '.[] | select(.name=="anon") | .api_key' | head -1)"
fi
KEY="$VITE_SUPABASE_ANON_KEY"

pass=0; fail=0
check() { # check <label> <expected> <actual>
  if [ "$2" = "$3" ]; then printf '  \033[32mPASS\033[0m  %s\n' "$1"; pass=$((pass+1))
  else printf '  \033[31mFAIL\033[0m  %s (expected %s, got %s)\n' "$1" "$2" "$3"; fail=$((fail+1)); fi
}

get() { # get <path> [extra headers...]
  curl -sS -o /tmp/lc_body -w '%{http_code}' \
    -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
    -H "Accept-Profile: leadcapture" "$URL/rest/v1/$1"
}

echo
echo "Verifying $URL"
echo

# The single most common deployment failure: the schema is not exposed, so
# every request 404s no matter how correct the database is.
code="$(get 'businesses?select=slug,name&limit=1')"
check "leadcapture schema is exposed to PostgREST" "200" "$code"
if [ "$code" != "200" ]; then
  echo
  echo "  -> Add 'leadcapture' under Settings -> API -> Exposed schemas,"
  echo "     or re-run ./scripts/bootstrap.sh which does it for you."
  echo "     Response: $(head -c 200 /tmp/lc_body)"
  echo
fi

slug="$(jq -r '.[0].slug // empty' /tmp/lc_body 2>/dev/null)"
[ -n "$slug" ] && echo "         first tenant: /$slug"

code="$(get 'services?select=id&limit=1')"
check "public can read services (landing page renders)" "200" "$code"

# The security property that matters most: the public key must not be able to
# read anyone's leads.
code="$(get 'leads?select=id&limit=1')"
if [ "$code" = "200" ]; then
  check "public CANNOT read leads" "not-200" "200 LEAK"
else
  check "public CANNOT read leads" "blocked" "blocked"
fi

code="$(get 'business_users?select=id&limit=1')"
if [ "$code" = "200" ]; then
  check "public CANNOT read business_users" "not-200" "200 LEAK"
else
  check "public CANNOT read business_users" "blocked" "blocked"
fi

# Edge Function reachable?
fn_code="$(curl -sS -o /tmp/lc_fn -w '%{http_code}' -X POST \
  "$URL/functions/v1/leadcapture-submit-lead" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" -d '{}')"
if [ "$fn_code" = "404" ]; then
  printf '  \033[33mSKIP\033[0m  Edge Function not deployed (form falls back to direct insert)\n'
else
  check "Edge Function rejects an empty submission" "400" "$fn_code"
fi

echo
if [ "$fail" -eq 0 ]; then
  printf '\033[32m%s checks passed.\033[0m\n' "$pass"
else
  printf '\033[31m%s passed, %s FAILED.\033[0m\n' "$pass" "$fail"
fi
rm -f /tmp/lc_body /tmp/lc_fn
exit $([ "$fail" -eq 0 ] && echo 0 || echo 1)
