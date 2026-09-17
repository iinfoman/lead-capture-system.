-- ---------------------------------------------------------------------------
-- Run this ONCE, after `leadcapture-submit-lead` is deployed and you have
-- confirmed a real submission comes through it.
--
-- It is NOT in supabase/migrations/ on purpose: applying it before the Edge
-- Function is live would break the lead form, because the browser falls back
-- to a direct insert whenever the function is unreachable.
--
-- What it does: removes the last path by which someone holding the anon key
-- (which ships in the browser bundle, and is meant to be public) could write
-- rows straight into `leads`, bypassing the Edge Function's validation,
-- honeypot and rate limit. Afterwards the ONLY way to create a lead is
-- through the function, which inserts with the service-role key.
--
-- To verify before running:
--   1. Submit a test lead on the live site.
--   2. Check the function logs show it (Supabase -> Edge Functions -> Logs).
--   3. Confirm the owner received the notification email.
-- If all three hold, the fallback is no longer load-bearing.
--
-- To roll back, re-run migration 20260917090100_leadcapture_rls.sql and
-- re-grant: grant insert on leadcapture.leads to anon;
-- ---------------------------------------------------------------------------

begin;

drop policy if exists "public insert leads" on leadcapture.leads;
revoke insert on leadcapture.leads from anon;

-- Anonymous visitors keep read access to the presentation tables (the landing
-- page must still render logged-out) and keep the ability to upload a lead
-- photo into <business_id>/leads/, which the function references by URL.

do $$
declare
  leftover int;
begin
  select count(*) into leftover
  from pg_policy
  where polrelid = 'leadcapture.leads'::regclass
    and polname = 'public insert leads';

  if leftover > 0 then
    raise exception 'public insert policy still present — not hardened';
  end if;

  if has_table_privilege('anon', 'leadcapture.leads', 'INSERT') then
    raise exception 'anon still holds INSERT on leads — not hardened';
  end if;

  raise notice 'Hardened: anon can no longer write to leadcapture.leads.';
end
$$;

commit;
