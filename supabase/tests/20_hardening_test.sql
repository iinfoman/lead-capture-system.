\set ON_ERROR_STOP on
\pset pager off

-- Proves supabase/manual/harden_after_edge_function_deploy.sql does what it
-- claims. Runs last because it deliberately removes the anon insert path.

create or replace function public.t_check(label text, actual text, expected text)
returns void language plpgsql as $$
begin
  if actual is not distinct from expected then
    raise notice 'PASS  %  (got %)', label, actual;
  else
    raise exception 'FAIL  %  expected % but got %', label, expected, actual;
  end if;
end;
$$;

-- Before: a public submission works (this is what keeps the form alive until
-- the Edge Function is deployed).
begin;
set local role anon;
do $$
declare n int;
begin
  insert into leadcapture.leads (business_id, customer_name, phone, description, status)
  values ('11111111-1111-4111-8111-111111111111', 'Pre-harden', '27820000123', 'x', 'new');
  get diagnostics n = row_count;
  perform public.t_check('before hardening, anon can submit a lead', n::text, '1');
end
$$;
rollback;

\i :harden_file

-- After: the anon write path is gone entirely.
begin;
set local role anon;
do $$
begin
  begin
    insert into leadcapture.leads (business_id, customer_name, phone, description, status)
    values ('11111111-1111-4111-8111-111111111111', 'Post-harden', '27820000124', 'x', 'new');
    raise exception 'FAIL  anon could still insert a lead after hardening';
  exception when insufficient_privilege then
    raise notice 'PASS  after hardening, anon cannot write to leads';
  end;

  -- The landing page must still render for a logged-out visitor.
  perform public.t_check('after hardening, anon still reads business config',
    (select count(*) from leadcapture.businesses)::text, '2');
  perform public.t_check('after hardening, anon still reads services',
    (select count(*) from leadcapture.services)::text, '7');
end
$$;
rollback;

-- The owner path is untouched.
begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-00000000000a';
do $$
begin
  perform public.t_check('after hardening, owner A still sees their leads',
    (select count(*) from leadcapture.leads)::text, '5');
end
$$;
rollback;

drop function public.t_check(text, text, text);

\echo ''
\echo '==============================='
\echo ' HARDENING SCRIPT VERIFIED'
\echo '==============================='
