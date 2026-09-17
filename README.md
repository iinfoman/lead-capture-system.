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
| Frontend  | React 18 + Vite 5 + Tailwind 3, React Router 6                     |
| Backend   | Supabase Postgres in a dedicated `leadcapture` schema, RLS on everything |
| Functions | Supabase Edge Functions (Deno) for lead submission and email       |
| Email     | Resend free tier                                                   |
| Storage   | Supabase Storage bucket `leadcapture-photos`, one folder per tenant |
| Hosting   | Netlify (frontend), Supabase (backend)                             |

No paid APIs. WhatsApp is a `wa.me` deep link, not the Business API. The
service area is text, not a paid Maps embed.

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

### 6. Netlify

Connect the repo; `netlify.toml` already sets the build command, the publish
directory and the SPA redirect that makes `/:slug` work. Add
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under **Site settings →
Environment variables**.

---

## Verifying tenant isolation

The thing most worth being sure about is that one business can never see
another's leads. There is a real test for it:

```bash
./supabase/tests/run.sh
```

It spins up a throwaway local Postgres, stubs the `auth.*` and `storage.*`
objects Supabase would provide, applies the real migrations, re-applies them to
prove they are idempotent, and then runs 30 assertions as four different roles
— owner A, owner B, an anonymous visitor and a platform admin. It never touches
the shared Ovibe project.

Among them: owner A cannot read, update or delete tenant B's leads; cannot
reassign one of their own leads into tenant B; anonymous visitors have no read
access to `leads` whatsoever; and a lead submission cannot arrive pre-loaded
with a quote or a non-`new` status.

---

## Layout

```
src/
  lib/              supabase client, data access, validation, formatting
  context/          AuthProvider, BusinessConfigProvider
  components/
    landing/        hero, services, reviews, gallery, lead form, confirmation
    dashboard/      kanban board, lead card, detail panel, filters, settings
    admin/          master admin guard, business switcher, cross-tenant table
    common/         guards, loaders, empty and error states
  pages/            one file per route
supabase/
  migrations/       schema, RLS, storage, seed
  functions/        leadcapture-submit-lead + shared validation/email/cors
  tests/            tenant isolation suite
```

### Two things worth knowing before you change anything

**Validation exists twice, on purpose.** `src/lib/validation.js` gives the
customer instant feedback; `supabase/functions/_shared/validation.ts` is the
copy that actually decides, because the client one can be bypassed. Change one,
change the other.

**The lead insert is a single trigger point.** Everything that should happen
when a lead lands goes through `dispatchNotifications` in the Edge Function.
Phase 2 work (WhatsApp Business API, Sheets sync, Make.com) adds a promise to
that array — no schema change and no new insert path.

---

## What is deliberately not built

WhatsApp Business API, payment processing, calendar sync, Google Sheets and
Make.com integrations, staff roles beyond owner, multi-language, an analytics
dashboard, SMS, review-request automation.

The hooks are clean — the plumbing is not there, and should not be added until
someone is actually paying for it.
