#!/usr/bin/env bash
#
# One-command provisioning for this app. Run it once per environment and it
# does every step that otherwise means clicking through two dashboards:
#
#   1. applies the database migrations
#   2. adds `leadcapture` to the project's PostgREST exposed schemas
#   3. deploys the lead-submission Edge Function and its secrets
#   4. sets the Netlify build env vars and triggers a deploy
#   5. optionally creates an owner login and links it to a business
#
# It is idempotent: run it again after changing a migration and it will
# re-apply cleanly.
#
#   cp .env.deploy.example .env.deploy   # fill in, it is gitignored
#   ./scripts/bootstrap.sh
#
# Nothing here needs to be pasted into a chat window. The tokens stay on your
# machine.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# shellcheck disable=SC1091
[ -f .env.deploy ] && set -a && . ./.env.deploy && set +a

MGMT="https://api.supabase.com/v1"

say()  { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
ok()   { printf '    \033[32m%s\033[0m\n' "$*"; }
warn() { printf '    \033[33m%s\033[0m\n' "$*"; }
die()  { printf '\n\033[31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

need() {
  local missing=0
  for v in "$@"; do
    [ -z "${!v:-}" ] && { echo "  missing: $v" >&2; missing=1; }
  done
  [ "$missing" -eq 1 ] && die "Set the variables above in .env.deploy"
  return 0
}

have() { command -v "$1" >/dev/null 2>&1; }

api() { # api <method> <path> [json-body]
  local method="$1" path="$2" body="${3:-}"
  local args=(-sS -X "$method" "$MGMT$path"
              -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"
              -H "Content-Type: application/json")
  [ -n "$body" ] && args+=(-d "$body")
  curl "${args[@]}"
}

# ---------------------------------------------------------------------------
say "Checking prerequisites"
# ---------------------------------------------------------------------------
need SUPABASE_ACCESS_TOKEN SUPABASE_PROJECT_REF
have curl || die "curl is required"
have jq   || die "jq is required (brew install jq / apt install jq)"
ok "supabase project: $SUPABASE_PROJECT_REF"

# ---------------------------------------------------------------------------
say "1/5  Applying database migrations"
# ---------------------------------------------------------------------------
if [ -n "${SUPABASE_DB_URL:-}" ] && have psql; then
  for f in supabase/migrations/*.sql; do
    psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -q -f "$f" >/dev/null
    ok "applied $(basename "$f")"
  done
elif have supabase; then
  supabase link --project-ref "$SUPABASE_PROJECT_REF" >/dev/null 2>&1 || true
  supabase db push
  ok "migrations pushed via the Supabase CLI"
else
  die "Need either SUPABASE_DB_URL + psql, or the supabase CLI on PATH"
fi

# ---------------------------------------------------------------------------
say "2/5  Exposing the leadcapture schema to PostgREST"
# ---------------------------------------------------------------------------
# This project is shared with other apps, so read the current config and add
# to it rather than overwriting — clobbering db_schema here would take the
# other app's API offline.
current="$(api GET "/projects/$SUPABASE_PROJECT_REF/postgrest" 2>/dev/null)"
existing="$(echo "$current" | jq -r '.db_schema // empty' 2>/dev/null)"

if [ -n "$existing" ] && echo "$existing" | tr ',' '\n' | tr -d ' ' | grep -qx "leadcapture"; then
  ok "already exposed: $existing"
elif [ -n "$existing" ]; then
  merged="$existing,leadcapture"
  updated="$(api PATCH "/projects/$SUPABASE_PROJECT_REF/postgrest" \
             "$(jq -nc --arg s "$merged" '{db_schema:$s}')")"
  if echo "$updated" | jq -e '.db_schema' >/dev/null 2>&1; then
    ok "exposed schemas now: $(echo "$updated" | jq -r '.db_schema')"
  else
    die "Could not update exposed schemas: $updated"
  fi
elif [ -n "${SUPABASE_DB_URL:-}" ] && have psql; then
  # Fallback when the Management API is unreachable (restricted network, no
  # PAT). PostgREST on Supabase runs with db-config enabled, which means it
  # reads its settings from the `authenticator` role rather than only from the
  # platform. Setting it here has the same effect as the dashboard field.
  #
  # Caveat worth knowing: once set, this role setting OVERRIDES the dashboard's
  # "Exposed schemas" field. To hand control back to the dashboard, run:
  #   alter role authenticator reset pgrst.db_schemas;
  warn "Management API unreachable — setting exposed schemas in-database instead"
  psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -q <<'SQL'
alter role authenticator set pgrst.db_schemas = 'public, graphql_public, leadcapture';
notify pgrst, 'reload config';
notify pgrst, 'reload schema';
SQL
  ok "exposed schemas set on the authenticator role"
else
  die "Could not reach the Management API, and no SUPABASE_DB_URL for the fallback"
fi

# ---------------------------------------------------------------------------
say "3/5  Deploying the lead-submission Edge Function"
# ---------------------------------------------------------------------------
if have supabase; then
  if [ -n "${RESEND_API_KEY:-}" ]; then
    supabase secrets set --project-ref "$SUPABASE_PROJECT_REF" \
      RESEND_API_KEY="$RESEND_API_KEY" \
      RESEND_FROM="${RESEND_FROM:-Leads <onboarding@resend.dev>}" \
      LEAD_IP_SALT="${LEAD_IP_SALT:-$(openssl rand -hex 16)}" \
      APP_BASE_URL="${APP_BASE_URL:-}" >/dev/null
    ok "function secrets set"
  else
    warn "RESEND_API_KEY not set — deploying anyway; emails will not send"
  fi

  supabase functions deploy leadcapture-submit-lead \
    --project-ref "$SUPABASE_PROJECT_REF" --no-verify-jwt >/dev/null
  ok "leadcapture-submit-lead deployed"
else
  warn "supabase CLI not found — skipping. The lead form still works via the"
  warn "RLS fallback, but nobody gets emailed. See README step 5."
fi

# ---------------------------------------------------------------------------
say "4/5  Configuring and deploying the Netlify site"
# ---------------------------------------------------------------------------
if have netlify && [ -n "${NETLIFY_AUTH_TOKEN:-}" ] && [ -n "${NETLIFY_SITE_ID:-}" ]; then
  anon="${VITE_SUPABASE_ANON_KEY:-$(api GET "/projects/$SUPABASE_PROJECT_REF/api-keys" \
        | jq -r '.[] | select(.name=="anon") | .api_key' | head -1)}"
  [ -z "$anon" ] && die "Could not resolve the anon key"

  netlify env:set VITE_SUPABASE_URL \
    "https://$SUPABASE_PROJECT_REF.supabase.co" --site "$NETLIFY_SITE_ID" >/dev/null
  netlify env:set VITE_SUPABASE_ANON_KEY "$anon" --site "$NETLIFY_SITE_ID" >/dev/null
  ok "netlify env vars set"

  netlify deploy --build --prod --site "$NETLIFY_SITE_ID"
  ok "site deployed"
else
  warn "Skipping Netlify (need the netlify CLI, NETLIFY_AUTH_TOKEN and"
  warn "NETLIFY_SITE_ID). Set these two vars in the Netlify UI instead:"
  warn "  VITE_SUPABASE_URL=https://$SUPABASE_PROJECT_REF.supabase.co"
  warn "  VITE_SUPABASE_ANON_KEY=<anon key>"
fi

# ---------------------------------------------------------------------------
say "5/5  Owner login"
# ---------------------------------------------------------------------------
# Creating the auth user is only half the job — the dashboard shows nothing
# until that user is linked to a business, which is what the second step does.
if [ -n "${OWNER_EMAIL:-}" ] && [ -n "${OWNER_PASSWORD:-}" ] && [ -n "${OWNER_BUSINESS_SLUG:-}" ]; then
  service_key="$(api GET "/projects/$SUPABASE_PROJECT_REF/api-keys?reveal=true" \
                 | jq -r '.[] | select(.name=="service_role") | .api_key' | head -1)"
  [ -z "$service_key" ] && die "Could not resolve the service_role key"

  user_id="$(curl -sS -X POST \
    "https://$SUPABASE_PROJECT_REF.supabase.co/auth/v1/admin/users" \
    -H "apikey: $service_key" -H "Authorization: Bearer $service_key" \
    -H "Content-Type: application/json" \
    -d "$(jq -nc --arg e "$OWNER_EMAIL" --arg p "$OWNER_PASSWORD" \
          '{email:$e,password:$p,email_confirm:true}')" \
    | jq -r '.id // empty')"

  if [ -z "$user_id" ]; then
    # Already exists — look it up instead of failing the whole run.
    user_id="$(curl -sS \
      "https://$SUPABASE_PROJECT_REF.supabase.co/auth/v1/admin/users?per_page=1000" \
      -H "apikey: $service_key" -H "Authorization: Bearer $service_key" \
      | jq -r --arg e "$OWNER_EMAIL" '.users[] | select(.email==$e) | .id' | head -1)"
  fi
  [ -z "$user_id" ] && die "Could not create or find the owner user"

  link_sql="insert into leadcapture.business_users (user_id, business_id, role)
            select '$user_id', b.id, 'owner' from leadcapture.businesses b
            where b.slug = '$OWNER_BUSINESS_SLUG'
            on conflict (user_id, business_id) do nothing;"

  if [ -n "${SUPABASE_DB_URL:-}" ] && have psql; then
    psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -q -c "$link_sql"
    ok "owner $OWNER_EMAIL linked to $OWNER_BUSINESS_SLUG"
  else
    warn "Run this once in the SQL editor to finish the link:"
    echo "$link_sql"
  fi

  if [ "${OWNER_IS_PLATFORM_ADMIN:-false}" = "true" ]; then
    admin_sql="insert into leadcapture.platform_admins (user_id)
               values ('$user_id') on conflict do nothing;"
    if [ -n "${SUPABASE_DB_URL:-}" ] && have psql; then
      psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -q -c "$admin_sql"
      ok "granted platform admin"
    else
      warn "Run this to grant platform admin:"; echo "$admin_sql"
    fi
  fi
else
  warn "Skipping (set OWNER_EMAIL, OWNER_PASSWORD, OWNER_BUSINESS_SLUG)"
fi

say "Done"
echo "    Landing page : https://$SUPABASE_PROJECT_REF.supabase.co  -> your Netlify URL /table-mountain-plumbing"
echo "    Next          : ./scripts/verify.sh   (checks it actually works end to end)"
