-- ---------------------------------------------------------------------------
-- Lead Capture System — Row Level Security
--
-- Two helper functions do the tenant lookup instead of inlining the
-- `business_id in (select ... from business_users where user_id = auth.uid())`
-- subquery into every policy. Inlining it would make each policy re-enter
-- business_users, which is itself RLS-protected — Postgres then either
-- recurses or silently returns no rows. A `security definer` helper with a
-- pinned empty search_path reads the mapping once, safely.
-- ---------------------------------------------------------------------------

create or replace function leadcapture.user_business_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select bu.business_id
  from leadcapture.business_users bu
  where bu.user_id = (select auth.uid());
$$;

create or replace function leadcapture.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from leadcapture.platform_admins pa
    where pa.user_id = (select auth.uid())
  );
$$;

revoke all on function leadcapture.user_business_ids() from public;
revoke all on function leadcapture.is_platform_admin() from public;
grant execute on function leadcapture.user_business_ids() to authenticated;
grant execute on function leadcapture.is_platform_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere. Nothing in this schema is readable without a policy.
-- ---------------------------------------------------------------------------
alter table leadcapture.businesses        enable row level security;
alter table leadcapture.business_users    enable row level security;
alter table leadcapture.services          enable row level security;
alter table leadcapture.testimonials      enable row level security;
alter table leadcapture.faqs              enable row level security;
alter table leadcapture.work_photos       enable row level security;
alter table leadcapture.leads             enable row level security;
alter table leadcapture.platform_admins   enable row level security;
alter table leadcapture.lead_submission_log enable row level security;

-- ---------------------------------------------------------------------------
-- Public read: the landing page must render for logged-out visitors.
-- Only the presentation tables are public — never leads, never business_users.
-- ---------------------------------------------------------------------------
drop policy if exists "public read businesses" on leadcapture.businesses;
create policy "public read businesses" on leadcapture.businesses
  for select to anon, authenticated using (active);

drop policy if exists "public read services" on leadcapture.services;
create policy "public read services" on leadcapture.services
  for select to anon, authenticated using (true);

drop policy if exists "public read testimonials" on leadcapture.testimonials;
create policy "public read testimonials" on leadcapture.testimonials
  for select to anon, authenticated using (true);

drop policy if exists "public read faqs" on leadcapture.faqs;
create policy "public read faqs" on leadcapture.faqs
  for select to anon, authenticated using (true);

drop policy if exists "public read photos" on leadcapture.work_photos;
create policy "public read photos" on leadcapture.work_photos
  for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- Leads
--
-- Public submit path: the browser normally posts to the
-- `leadcapture-submit-lead` Edge Function, which validates + rate-limits and
-- then inserts with the service-role key (bypassing RLS). This anon insert
-- policy is the documented fallback for a direct client insert. It grants
-- INSERT only — never select/update — so a spammer with the anon key can add
-- rows but can never read anyone's leads. Once every client goes through the
-- Edge Function you can safely drop this policy; see docs/SECURITY.md.
-- ---------------------------------------------------------------------------
drop policy if exists "public insert leads" on leadcapture.leads;
create policy "public insert leads" on leadcapture.leads
  for insert to anon, authenticated
  with check (
    status = 'new'
    and quote_amount is null
    and notes is null
    and exists (
      select 1 from leadcapture.businesses b
      where b.id = business_id and b.active
    )
  );

-- Owners: full control over their own business's leads.
-- `with check` matters as much as `using` here — without it an owner could
-- UPDATE a lead's business_id and hand their row to another tenant.
drop policy if exists "owners read own leads" on leadcapture.leads;
create policy "owners read own leads" on leadcapture.leads
  for select to authenticated
  using (business_id in (select leadcapture.user_business_ids()));

drop policy if exists "owners update own leads" on leadcapture.leads;
create policy "owners update own leads" on leadcapture.leads
  for update to authenticated
  using (business_id in (select leadcapture.user_business_ids()))
  with check (business_id in (select leadcapture.user_business_ids()));

drop policy if exists "owners delete own leads" on leadcapture.leads;
create policy "owners delete own leads" on leadcapture.leads
  for delete to authenticated
  using (business_id in (select leadcapture.user_business_ids()));

-- ---------------------------------------------------------------------------
-- Business config: owners manage their own row and their own child rows.
-- ---------------------------------------------------------------------------
-- An owner reads their own business row unconditionally. The public policy
-- above is `using (active)`, so without this an inactive business would
-- disappear from its own owner's dashboard and the login would look unlinked.
drop policy if exists "owners read own business" on leadcapture.businesses;
create policy "owners read own business" on leadcapture.businesses
  for select to authenticated
  using (id in (select leadcapture.user_business_ids()));

drop policy if exists "owners update own business" on leadcapture.businesses;
create policy "owners update own business" on leadcapture.businesses
  for update to authenticated
  using (id in (select leadcapture.user_business_ids()))
  with check (id in (select leadcapture.user_business_ids()));

-- services / testimonials / faqs / work_photos all share the same shape, so
-- generate the four write policies rather than hand-copying them.
do $$
declare
  t text;
begin
  foreach t in array array['services', 'testimonials', 'faqs', 'work_photos']
  loop
    execute format(
      'drop policy if exists "owners insert own %1$s" on leadcapture.%1$I', t);
    execute format($p$
      create policy "owners insert own %1$s" on leadcapture.%1$I
        for insert to authenticated
        with check (business_id in (select leadcapture.user_business_ids()))
    $p$, t);

    execute format(
      'drop policy if exists "owners update own %1$s" on leadcapture.%1$I', t);
    execute format($p$
      create policy "owners update own %1$s" on leadcapture.%1$I
        for update to authenticated
        using (business_id in (select leadcapture.user_business_ids()))
        with check (business_id in (select leadcapture.user_business_ids()))
    $p$, t);

    execute format(
      'drop policy if exists "owners delete own %1$s" on leadcapture.%1$I', t);
    execute format($p$
      create policy "owners delete own %1$s" on leadcapture.%1$I
        for delete to authenticated
        using (business_id in (select leadcapture.user_business_ids()))
    $p$, t);
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- business_users: a user may see their own membership rows (the dashboard
-- needs them to resolve "which business am I?"), and nobody else's.
-- ---------------------------------------------------------------------------
drop policy if exists "read own membership" on leadcapture.business_users;
create policy "read own membership" on leadcapture.business_users
  for select to authenticated
  using (user_id = (select auth.uid()) or leadcapture.is_platform_admin());

-- platform_admins: a user may check whether *they* are an admin. The list of
-- other admins stays private. There is no insert/update/delete policy at all,
-- so the table can only be written with the service-role key or from the SQL
-- editor — which is exactly the intent.
drop policy if exists "read own admin flag" on leadcapture.platform_admins;
create policy "read own admin flag" on leadcapture.platform_admins
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Master admin: stacked, permissive policies. RLS policies OR together, so
-- these add cross-tenant reach for admins without loosening anything for a
-- normal owner — an owner's login is unaffected by these existing.
-- ---------------------------------------------------------------------------
drop policy if exists "platform admin read leads" on leadcapture.leads;
create policy "platform admin read leads" on leadcapture.leads
  for select to authenticated using (leadcapture.is_platform_admin());

drop policy if exists "platform admin update leads" on leadcapture.leads;
create policy "platform admin update leads" on leadcapture.leads
  for update to authenticated
  using (leadcapture.is_platform_admin())
  with check (leadcapture.is_platform_admin());

drop policy if exists "platform admin read businesses" on leadcapture.businesses;
create policy "platform admin read businesses" on leadcapture.businesses
  for select to authenticated using (leadcapture.is_platform_admin());

drop policy if exists "platform admin update businesses" on leadcapture.businesses;
create policy "platform admin update businesses" on leadcapture.businesses
  for update to authenticated
  using (leadcapture.is_platform_admin())
  with check (leadcapture.is_platform_admin());

do $$
declare
  t text;
begin
  foreach t in array array['services', 'testimonials', 'faqs', 'work_photos']
  loop
    execute format(
      'drop policy if exists "platform admin read %1$s" on leadcapture.%1$I', t);
    execute format($p$
      create policy "platform admin read %1$s" on leadcapture.%1$I
        for select to authenticated using (leadcapture.is_platform_admin())
    $p$, t);
  end loop;
end
$$;

-- lead_submission_log has RLS on and zero policies: unreachable by anon and
-- authenticated alike. Only the Edge Function's service-role key touches it.
