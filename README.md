# Lead Capture System

Multi-tenant lead capture and management for Cape Town service businesses —
plumbers, electricians, cleaners, movers, mechanics, landscapers, builders.

Each business gets a landing page customers can actually use, and one inbox to
work the leads it brings in. It is deliberately **a landing page plus an
inbox, not a CRM**.

- **Public page** — `/:businessSlug`, rendered entirely from a config row. No
  business content is hardcoded in a component.
- **Dashboard** — `/dashboard`, a kanban board over the seven pipeline
  statuses, scoped by RLS to the logged-in owner's business.
- **Master admin** — `/master-admin`, every business and every lead in one
  place, with a way to drop into any tenant's dashboard.

---

## Stack

| Layer     | Choice                                                            |
| --------- | ----------------------------------------------------------------- |
| Frontend  | React 18 + Vite 5 + Tailwind 3, React Router 6 (route-split)        |
| Backend   | Supabase Postgres in a dedicated `leadcapture` schema, RLS on everything |
| Functions | Supabase Edge Functions (Deno) for lead submission and email       |
| Email     | Resend free tier                                                   |
| Storage   | Supabase Storage bucket `leadcapture-photos`, one folder per tenant |
| Hosting   | Netlify (frontend), Supabase (backend)                             |

No paid APIs. WhatsApp is a `wa.me` deep link, not the Business API. The
service area is text, not a paid Maps embed.

### Page weight, because it is a business requirement here

Customers reach these pages on prepaid data, often on a mid-range Android.
So the public landing page does not load anything it does not need:

| | gzipped | budget |
| --- | --- | --- |
| Landing route JS | **67 KB** | 200 KB |
| CSS | **7 KB** | 60 KB |
| Everything behind a login | 79 KB | loaded lazily, never by a customer |

Two decisions get it there, and both are worth keeping:

- **Everything behind a login is route-split**, including the Supabase SDK
  itself. It is reached only through `AuthShell`, so a customer reading a
  plumber's page never downloads the kanban board or the admin table.
- **The public page talks to PostgREST directly** (`src/lib/publicApi.js`)
  rather than through `@supabase/supabase-js`. The SDK bundles a realtime
  client this app never uses and an auth client a customer never needs;
  skipping it roughly halves the JavaScript on the only route customers load.
  Authenticated routes still use the SDK — see `src/lib/api.js`.

The font is self-hosted (`public/fonts/`): one variable woff2, latin subset,
48 KB, covering every weight. It replaced five static weights fetched from
Google's CDN, which also removes a third-party connection and the POPIA
question that comes with it.

---

## It lives inside the shared Ovibe project

To stay inside the two-project free-tier limit, this system is **its own
Postgres schema inside the existing Ovibe Supabase project**, not a new
project.

- Everything lives in `leadcapture.*`, never `public`.
- `leadcapture` must be listed under **Settings → API → Exposed schemas**, or
  PostgREST will refuse every request.
- The client is pinned with `createClient(url, anonKey, { db: { schema: 'leadcapture' } })`.
- Auth is shared project-wide. `auth.users` holds users from every app in the
  project, which is harmless: isolation is enforced per row by `business_id`,
  not by which app a user signed up through.
- Storage uses its own bucket so files do not mix with the other app's.
- Edge Functions are prefixed (`leadcapture-submit-lead`) since the project
  serves more than one app.
- **The free tier's limits are shared** — 500MB database, 1GB storage, 2GB
  egress per month across every app in the project. Watch the usage dashboard;
  this app filling up is the other app's problem too.

---

## Getting it running

### Fastest path: one command

```bash
cp .env.deploy.example .env.deploy   # fill in, it is gitignored
./scripts/bootstrap.sh               # does all five steps below
./scripts/verify.sh                  # proves it works from the outside
```

`bootstrap.sh` applies the migrations, adds `leadcapture` to the project's
exposed schemas over the Management API, deploys the Edge Function and its
secrets, sets the Netlify env vars and deploys, and optionally creates the
first owner login *and* links it to a business — the step that is easiest to
forget, because without it the dashboard just looks broken.

It is idempotent, and it reads the project's existing exposed-schema list and
appends to it rather than overwriting, since this project is shared with
another app.

`verify.sh` then checks the deployment from outside, with the public key: that
the schema is actually exposed, that the landing page can read its config, and
that the public key **cannot** read leads or business_users.

The manual walkthrough below is the same work, by hand, if you would rather see
each step.

### 1. Database

Run the migrations in order against the Ovibe project (SQL editor, or
`supabase db push` if you have the project linked):

```
supabase/migrations/
  20260917090000_leadcapture_schema.sql    tables, indexes, grants
  20260917090100_leadcapture_rls.sql       row level security
  20260917090200_leadcapture_storage.sql   bucket + storage policies
  20260917090300_leadcapture_seed_demo.sql two demo tenants
```

There is also `supabase/manual/harden_after_edge_function_deploy.sql`, which is
deliberately **not** in `migrations/`. Run it once the Edge Function is live;
see step 5 and `docs/SECURITY.md`.

Every migration is idempotent — re-running one is safe.

Then add `leadcapture` to **Settings → API → Exposed schemas**.

The seed creates two tenants on purpose: `table-mountain-plumbing` to demo,
and `atlantic-sparks` to prove one tenant cannot see the other.

### 2. Frontend

```bash
cp .env.example .env     # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Open http://localhost:5173 for the signpost page, or go straight to
http://localhost:5173/table-mountain-plumbing.

If the env vars are missing the app says so plainly rather than spinning.

### 3. Link a login to a business

Creating an auth user is only half the job — the dashboard shows nothing until
that user is linked to a business. Sign up at `/signup`, then from the SQL
editor:

```sql
insert into leadcapture.business_users (user_id, business_id, role)
values (
  '<auth user id from auth.users>',
  '11111111-1111-4111-8111-111111111111',   -- Table Mountain Plumbing
  'owner'
);
```

Signup is invite-only by design for the MVP: anyone can create an account, but
an account with no `business_users` row can see nothing at all.

### 4. Master admin (you)

```sql
insert into leadcapture.platform_admins (user_id) values ('<your auth user id>');
```

That one row is the whole mechanism. There is deliberately no UI, no signup
flow and no toggle that lets anyone add themselves — see
[docs/SECURITY.md](docs/SECURITY.md).

### 5. Edge Function and email

```bash
supabase functions deploy leadcapture-submit-lead --no-verify-jwt

supabase secrets set \
  RESEND_API_KEY=re_xxx \
  RESEND_FROM="Leads <leads@yourdomain.co.za>" \
  LEAD_IP_SALT="$(openssl rand -hex 16)" \
  APP_BASE_URL=https://your-site.netlify.app
```

`--no-verify-jwt` is correct here: the lead form is public and calls the
function with the anon key.

**The app works before you deploy this.** If the function is unreachable the
form falls back to a direct insert permitted by the public RLS policy. The
lead is saved either way — but nobody is emailed, and the confirmation screen
tells the customer the truth about that.

**Once the function is live, close that fallback:**

```bash
psql "$DATABASE_URL" -f supabase/manual/harden_after_edge_function_deploy.sql
```

That removes the last route by which someone holding the public anon key could
write leads directly, skipping validation, the honeypot and the rate limit. The
script refuses to report success unless the policy and the grant are both gone,
and the test suite proves it leaves public reads and owner access intact.

### 6. Netlify

Connect the repo; `netlify.toml` already sets the build command, the publish
directory and the SPA redirect that makes `/:slug` work. Add
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under **Site settings →
Environment variables**.

---

## Verifying it

Two suites, both runnable offline.

### Database — tenant isolation

The thing most worth being sure about is that one business can never see
another's leads.

```bash
./supabase/tests/run.sh
```

It spins up a throwaway local Postgres, stubs the `auth.*` and `storage.*`
objects Supabase would provide, applies the real migrations, re-applies them to
prove they are idempotent, and then runs 38 assertions as four roles, plus service_role
— owner A, owner B, an anonymous visitor and a platform admin. It never touches
the shared Ovibe project.

Among them: owner A cannot read, update or delete tenant B's leads; cannot
reassign one of their own leads into tenant B; anonymous visitors have no read
access to `leads` whatsoever; and a lead submission cannot arrive pre-loaded
with a quote or a non-`new` status. The final phase runs the hardening script
above and proves it closes the anon write path without breaking the public
landing page.

### Browser — the customer journey

```bash
npm run test:e2e
```

Builds the app against a mock PostgREST, then drives a real Chromium at phone
width through the whole journey: landing page hydrates from the config row,
branding lands as a CSS variable, the form prompt adapts to the chosen service,
a bad phone number is refused, a good submission reaches the confirmation
screen. The mock also asserts the requests themselves — that PostgREST was
asked for the `leadcapture` schema, and that the phone number was already
normalised to E.164 on the wire.

---

## Layout

```
src/
  lib/              config, public (SDK-free) data path, SDK data path,
                    validation, formatting
  context/          AuthProvider, BusinessConfigProvider
  components/
    landing/        hero, services, reviews, gallery, lead form, confirmation
    dashboard/      kanban board, lead card, detail panel, filters, settings
    admin/          master admin guard, business switcher, cross-tenant table
    common/         guards, loaders, empty and error states
  pages/            one file per route
supabase/
  migrations/       schema, RLS, storage, seed
  manual/           post-deploy hardening (run once, by hand)
  functions/        leadcapture-submit-lead + shared validation/email/cors
  tests/            tenant isolation + hardening suite
e2e/                mock backend + browser test of the customer journey
```

### Three things worth knowing before you change anything

**Validation exists twice, on purpose.** `src/lib/validation.js` gives the
customer instant feedback; `supabase/functions/_shared/validation.ts` is the
copy that actually decides, because the client one can be bypassed. Change one,
change the other.

**The lead insert is a single trigger point.** Everything that should happen
when a lead lands goes through `dispatchNotifications` in the Edge Function.
Phase 2 work (WhatsApp Business API, Sheets sync, Make.com) adds a promise to
that array — no schema change and no new insert path.

**There are two data paths, and that is deliberate.** `lib/publicApi.js` is
plain `fetch` for the public page; `lib/api.js` uses the SDK for everything
behind a login. The split is what keeps the SDK out of the customer's download.
If you add a public read, add it to `publicApi.js` — importing `lib/api.js`
into a landing component silently pulls the whole SDK back into that bundle.

---

## What is deliberately not built

WhatsApp Business API, payment processing, calendar sync, Google Sheets and
Make.com integrations, staff roles beyond owner, multi-language, an analytics
dashboard, SMS, review-request automation.

The hooks are clean — the plumbing is not there, and should not be added until
someone is actually paying for it.
