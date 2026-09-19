# Security

The whole system rests on one claim: **a business owner can only ever see
their own leads.** Everything below either enforces that or keeps it honest.

## Where the boundary actually is

Row Level Security in Postgres, not the React app. The guards in
`AuthGuard.jsx` and `MasterAdminGuard.jsx` are there so people see a sensible
screen — they are not the security boundary. Someone who forces those
components to render still gets nothing back from the database.

There is **no service-role key in the browser**. The only place it exists is
the Edge Function environment.

## How tenant scoping works

Two `security definer` helpers do the lookup:

```sql
leadcapture.user_business_ids()  -- which businesses is this user in?
leadcapture.is_platform_admin()  -- is this user a master admin?
```

They exist because the obvious approach — inlining
`business_id in (select business_id from business_users where user_id = auth.uid())`
into every policy — makes each policy re-enter `business_users`, which is
itself RLS-protected. Postgres then either recurses or quietly returns no rows.
A `security definer` function with `set search_path = ''` reads the mapping once
and safely.

Both are revoked from `public` and granted only to `authenticated`.

## Deliberate choices worth knowing about

**Owner policies carry `with check`, not just `using`.** Without it an owner
could `UPDATE` a lead's `business_id` and hand the row to a competitor. There
is a test for exactly this.

**Anon has no `SELECT` grant on `leads` at all.** Not "RLS returns zero rows" —
no privilege in the first place, so the read is refused a layer earlier.

**The public insert policy is constrained.** A submitted lead must have
`status = 'new'` and a null `quote_amount` and `notes`, and must name an
active business. Those are the owner's fields; a form submission has no
business setting them.

**The public insert policy is a fallback, and you should drop it.** The browser
normally posts to the Edge Function, which validates, rate-limits and inserts
with the service-role key. The anon insert policy only exists so the form still
works before that function is deployed.

Once the function is live and you have seen a real submission come through it:

```bash
psql "$DATABASE_URL" -f supabase/manual/harden_after_edge_function_deploy.sql
```

It is a script rather than a line in the runbook because a manual step gets
forgotten, and because it should refuse to lie: it re-checks that both the
policy and the grant are gone and raises if either survives. The test suite
runs it against a throwaway database and proves it closes the anon write path
while leaving the public landing page and owner access working.

Until you run it, someone holding the anon key — which ships in the browser
bundle and is meant to be public — can write rows into `leads` directly,
skipping validation, the honeypot and the rate limit. They still cannot read
anything.

**Master admin is one manually inserted row.** `platform_admins` has a read
policy scoped to your own row and *no* insert, update or delete policy at all,
so it can only be written with the service-role key or from the SQL editor.
There is no UI, no signup flow and no toggle — and there should never be one.
The admin logs in with an ordinary account that happens to be listed in one
extra table, which is what avoids putting a service-role key in a browser.

**Policies stack rather than replace.** A platform admin passes the "owners
manage own leads" check on their own business *and* the "platform admin" check
everywhere else. No business owner's login gets broader access because the
admin policies exist.

**`lead_submission_log` has RLS on and zero policies.** Unreachable by `anon`
and `authenticated` alike. Only the Edge Function touches it. It stores a
salted SHA-256 of the caller IP, never the IP itself.

## Input handling

Validation runs twice. `src/lib/validation.js` is for fast feedback;
`supabase/functions/_shared/validation.ts` is the one that decides, because the
client copy can be bypassed. Phone numbers are normalised to E.164, enums are
checked against a fixed list, text is length-capped, and a photo reference must
be an `https://` URL.

The service a customer picks is re-checked server-side against the business
that owns it — otherwise a crafted request could stitch another tenant's
service onto a lead.

React escapes by default and there is no `dangerouslySetInnerHTML` anywhere.
The Edge Function escapes every interpolated value in the HTML emails, since
those are not React.

## Spam and abuse

- **Honeypot** — a hidden `company_website` field. A tripped honeypot returns
  `200` with no row written; telling a bot it was detected just teaches whoever
  wrote it to try again differently.
- **Rate limit** — `LEAD_RATE_LIMIT_PER_HOUR` (default 8) per salted IP hash.
  It **fails open**: a broken counter must not stand between a real customer
  and a business. The honeypot and validation still apply.
- **Storage** — anonymous uploads are confined to
  `<business_id>/leads/` under an *existing active* business, so the bucket
  cannot be used as free file hosting. Type and size are enforced by the bucket
  config, again client-side, and again in the function.

## Secrets

| Secret                      | Lives in                         |
| --------------------------- | -------------------------------- |
| `VITE_SUPABASE_URL`         | frontend bundle — public, fine   |
| `VITE_SUPABASE_ANON_KEY`    | frontend bundle — public, fine   |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Function env only           |
| `RESEND_API_KEY`            | Edge Function env only           |
| `LEAD_IP_SALT`              | Edge Function env only           |

`.env` is gitignored. The anon key is meant to be public — it is only safe
because RLS is on every table, which is why nothing here may ship with RLS
disabled "temporarily".

The public landing page reaches PostgREST with plain `fetch` rather than the
Supabase SDK (see `src/lib/publicApi.js`). That is a bundle-size decision, not
a security one: it sends the same anon key with the same `Accept-Profile`
header the SDK would, and every request is still subject to the same RLS
policies. Nothing about the trust model changes.

## How the schema is exposed

PostgREST is told to serve `leadcapture` via an in-database setting rather than
the dashboard field:

```sql
alter role authenticator set pgrst.db_schemas = 'public, graphql_public, leadcapture';
notify pgrst, 'reload config';
```

Supabase runs PostgREST with `db-config` enabled, so role settings win. Two
consequences worth knowing:

- This **overrides** Settings -> API -> Exposed schemas. Editing that field in
  the dashboard will appear to do nothing while this setting exists.
- To hand control back to the dashboard:
  `alter role authenticator reset pgrst.db_schemas;`

The list deliberately keeps `public` and `graphql_public`, Supabase's two
defaults, because this project is shared — dropping them would take the other
app's API offline.

## Before going live

- [ ] Run `npm test` — 35 database assertions and 16 browser checks pass
- [ ] Confirm `leadcapture` is in **Exposed schemas**
- [ ] Run `supabase/manual/harden_after_edge_function_deploy.sql` (above)
- [ ] Set `LEAD_ALLOWED_ORIGINS` on the Edge Function to your real domains
      instead of the `*` fallback
- [ ] Set a real `LEAD_IP_SALT` — the default is a known constant
- [ ] Verify the two seeded demo tenants cannot see each other, logged in as
      each owner in a real browser
- [ ] Delete or deactivate the demo tenants once real clients are on
