# Proving tenant isolation

Two ways to check the thing that matters most: that one business can never see
another's leads.

## Automated

```bash
./supabase/tests/run.sh
```

This spins up a throwaway local Postgres, stubs the `auth.*` and `storage.*`
objects Supabase provides, applies the real migrations from
`supabase/migrations/`, re-applies them to prove they are idempotent, and runs
38 assertions as four roles, plus service_role. It never connects to the shared Ovibe project.

What it asserts:

**Owner A (Table Mountain Plumbing)**
- sees exactly their own 5 leads, and zero of tenant B's
- sees only their own `business_users` row
- cannot update, delete, or even count a tenant B lead
- cannot edit tenant B's business config
- cannot reassign one of their own leads into tenant B (this is the
  `with check` clause; `using` alone would let it through)
- is not treated as a platform admin

**Owner B (Atlantic Sparks)** — the mirror image.

**Anonymous visitor**
- has no read access to `leads` whatsoever (refused at the grant layer, before
  RLS is even consulted)
- can read business config, services, testimonials and FAQs — the landing page
  must render logged-out
- can submit a lead
- cannot submit one pre-loaded with a quote or a non-`new` status
- cannot read the rate-limit log
- can upload only into `<business_id>/leads/`, only under an existing active
  business, and into no other folder or bucket

**Platform admin**
- sees every lead and every business across all tenants
- can update any tenant's lead
- gets this through stacked RLS policies, not a service-role key

**`service_role`** — the identity the Edge Function actually runs as, and the
one gap every other check above cannot see
- can read `businesses` (the function's lookup-by-slug) and insert/update a
  `leads` row (the function's write)
- exists because `BYPASSRLS` only skips row-level security *policy*
  evaluation — it is not the same permission as the base `GRANT`/`REVOKE`
  system, which a custom schema enforces from zero regardless of who bypasses
  RLS. The original schema migration granted `anon` and `authenticated` but
  never `service_role`, so every real submission 403'd with
  `permission denied for schema leadcapture` until
  `20260924151500_leadcapture_grant_service_role.sql` fixed it. Every
  anon/authenticated check above kept passing throughout, which is exactly
  why this needed its own explicit test rather than being caught by the rest
  of the suite.

**The hardening script** (runs last, since it is destructive)
- before it, an anonymous visitor can submit a lead
- after it, they cannot write to `leads` at all
- after it, the landing page still reads business config and services, and
  owner A still sees their own five leads

## By hand, in a real browser

Worth doing once before going live, because it exercises PostgREST and the
actual JWT rather than a local stand-in.

1. Create two auth users and link one to each demo tenant:

   ```sql
   insert into leadcapture.business_users (user_id, business_id, role) values
     ('<user A id>', '11111111-1111-4111-8111-111111111111', 'owner'),
     ('<user B id>', '22222222-2222-4222-8222-222222222222', 'owner');
   ```

2. Log in as A. The board shows five leads, all Table Mountain Plumbing.
3. Copy a lead id belonging to B (from the SQL editor) and visit
   `/dashboard/leads/<that id>`. You should land back on the board — RLS
   returned nothing, so there is nothing to open.
4. Log in as B in a private window. Two leads, none of A's.
5. Log in as the platform admin and open `/master-admin`. All seven leads,
   both businesses, with a business column. Click a business to drop into its
   dashboard; the amber banner should say you are viewing as an admin.

If step 3 ever shows you another tenant's lead, stop and re-check that all four
migrations ran — particularly `20260917090100_leadcapture_rls.sql`.
