\set ON_ERROR_STOP on
\pset pager off

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'owner-a@example.com'),
  ('bbbbbbbb-0000-4000-8000-00000000000b', 'owner-b@example.com'),
  ('cccccccc-0000-4000-8000-00000000000c', 'admin@example.com')
on conflict do nothing;

insert into leadcapture.business_users (user_id, business_id, role) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', '11111111-1111-4111-8111-111111111111', 'owner'),
  ('bbbbbbbb-0000-4000-8000-00000000000b', '22222222-2222-4222-8222-222222222222', 'owner')
on conflict do nothing;

insert into leadcapture.platform_admins (user_id)
values ('cccccccc-0000-4000-8000-00000000000c') on conflict do nothing;

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

-- ---------------------------------------------------------------------------
-- Owner A
-- ---------------------------------------------------------------------------
begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-00000000000a';

do $$
declare n int;
begin
  perform public.t_check('owner A sees only their own 5 leads',
    (select count(*) from leadcapture.leads)::text, '5');

  perform public.t_check('owner A sees zero tenant B leads',
    (select count(*) from leadcapture.leads
     where business_id = '22222222-2222-4222-8222-222222222222')::text, '0');

  perform public.t_check('owner A sees only their own membership row',
    (select count(*) from leadcapture.business_users)::text, '1');

  perform public.t_check('owner A is not a platform admin',
    leadcapture.is_platform_admin()::text, 'false');

  perform public.t_check('owner A sees their own business row',
    (select count(*) from leadcapture.businesses
     where id = '11111111-1111-4111-8111-111111111111')::text, '1');

  update leadcapture.leads set status = 'lost'
    where id = 'e2000000-0000-4000-8000-000000000001';
  get diagnostics n = row_count;
  perform public.t_check('owner A cannot update a tenant B lead', n::text, '0');

  update leadcapture.leads set notes = 'touched by A'
    where id = 'e1000000-0000-4000-8000-000000000001';
  get diagnostics n = row_count;
  perform public.t_check('owner A can update their own lead', n::text, '1');

  update leadcapture.businesses set name = 'hijacked'
    where id = '22222222-2222-4222-8222-222222222222';
  get diagnostics n = row_count;
  perform public.t_check('owner A cannot edit tenant B config', n::text, '0');

  delete from leadcapture.leads where id = 'e2000000-0000-4000-8000-000000000002';
  get diagnostics n = row_count;
  perform public.t_check('owner A cannot delete a tenant B lead', n::text, '0');

  -- WITH CHECK, not just USING: an owner must not be able to hand a row to
  -- another tenant by rewriting business_id.
  begin
    update leadcapture.leads
      set business_id = '22222222-2222-4222-8222-222222222222'
      where id = 'e1000000-0000-4000-8000-000000000001';
    raise exception 'FAIL  owner A reassigned a lead to another tenant';
  exception when insufficient_privilege then
    raise notice 'PASS  owner A blocked from reassigning a lead to another tenant';
  end;
end
$$;
rollback;

-- A deactivated business must stay visible to its own owner (the public
-- policy is `using (active)`), while disappearing for the public.
begin;
update leadcapture.businesses set active = false
  where id = '11111111-1111-4111-8111-111111111111';

set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-00000000000a';
do $$
begin
  perform public.t_check('owner A still sees their own deactivated business',
    (select count(*) from leadcapture.businesses
     where id = '11111111-1111-4111-8111-111111111111')::text, '1');
end
$$;
reset role;

set local role anon;
do $$
begin
  perform public.t_check('public no longer sees a deactivated business',
    (select count(*) from leadcapture.businesses
     where id = '11111111-1111-4111-8111-111111111111')::text, '0');
end
$$;
rollback;

-- ---------------------------------------------------------------------------
-- Owner B — the mirror image
-- ---------------------------------------------------------------------------
begin;
set local role authenticated;
set local request.jwt.claim.sub = 'bbbbbbbb-0000-4000-8000-00000000000b';
do $$
begin
  perform public.t_check('owner B sees only their own 2 leads',
    (select count(*) from leadcapture.leads)::text, '2');
  perform public.t_check('owner B sees zero tenant A leads',
    (select count(*) from leadcapture.leads
     where business_id = '11111111-1111-4111-8111-111111111111')::text, '0');
end
$$;
rollback;

-- ---------------------------------------------------------------------------
-- Anonymous visitor
-- ---------------------------------------------------------------------------
begin;
set local role anon;
do $$
declare n int;
begin
  -- Stronger than "RLS returns no rows": anon holds no SELECT grant on
  -- leads at all, so the read is refused at the privilege layer first.
  begin
    perform 1 from leadcapture.leads;
    raise exception 'FAIL  anon could read the leads table';
  exception when insufficient_privilege then
    raise notice 'PASS  anon has no read access to leads whatsoever';
  end;
  perform public.t_check('anon reads public business config',
    (select count(*) from leadcapture.businesses)::text, '2');
  perform public.t_check('anon reads services for the landing page',
    (select count(*) from leadcapture.services)::text, '7');
  perform public.t_check('anon reads testimonials and faqs',
    ((select count(*) from leadcapture.testimonials)
     + (select count(*) from leadcapture.faqs))::text, '12');

  insert into leadcapture.leads (business_id, customer_name, phone, description, status)
  values ('11111111-1111-4111-8111-111111111111', 'Anon Tester', '27820000000', 'test', 'new');
  get diagnostics n = row_count;
  perform public.t_check('anon can submit a lead', n::text, '1');

  -- A submission must not arrive pre-loaded with owner-only fields.
  begin
    insert into leadcapture.leads
      (business_id, customer_name, phone, description, status, quote_amount)
    values ('11111111-1111-4111-8111-111111111111', 'Spammer', '27820000001', 'x', 'booked', 99999);
    raise exception 'FAIL  anon injected an owner-only field';
  exception when insufficient_privilege then
    raise notice 'PASS  anon blocked from setting status/quote on insert';
  end;

  begin
    perform 1 from leadcapture.lead_submission_log;
    raise exception 'FAIL  anon could read the rate-limit log';
  exception when insufficient_privilege then
    raise notice 'PASS  anon blocked from the rate-limit log';
  end;
end
$$;
rollback;

-- ---------------------------------------------------------------------------
-- Platform admin — cross-tenant reach via stacked policies only
-- ---------------------------------------------------------------------------
begin;
set local role authenticated;
set local request.jwt.claim.sub = 'cccccccc-0000-4000-8000-00000000000c';
do $$
declare n int;
begin
  perform public.t_check('admin is recognised',
    leadcapture.is_platform_admin()::text, 'true');
  perform public.t_check('admin sees every lead across all tenants',
    (select count(*) from leadcapture.leads)::text, '7');
  perform public.t_check('admin sees every business',
    (select count(*) from leadcapture.businesses)::text, '2');

  update leadcapture.leads set notes = 'admin touched'
    where id = 'e2000000-0000-4000-8000-000000000001';
  get diagnostics n = row_count;
  perform public.t_check('admin can update any tenant lead', n::text, '1');
end
$$;
rollback;


-- ---------------------------------------------------------------------------
-- Storage policies
--
-- The bucket is one folder per tenant. A public visitor may drop a lead photo
-- into <business_id>/leads/ and nowhere else; an owner controls their whole
-- folder and nobody else's.
-- ---------------------------------------------------------------------------
begin;
set local role anon;
do $$
declare n int;
begin
  insert into storage.objects (bucket_id, name)
  values ('leadcapture-photos', '11111111-1111-4111-8111-111111111111/leads/a.jpg');
  get diagnostics n = row_count;
  perform public.t_check('anon may upload into <business>/leads/', n::text, '1');

  begin
    insert into storage.objects (bucket_id, name)
    values ('leadcapture-photos', '11111111-1111-4111-8111-111111111111/branding/logo.png');
    raise exception 'FAIL  anon uploaded into the branding folder';
  exception when insufficient_privilege then
    raise notice 'PASS  anon blocked from <business>/branding/';
  end;

  begin
    insert into storage.objects (bucket_id, name)
    values ('leadcapture-photos', 'not-a-business/leads/a.jpg');
    raise exception 'FAIL  anon uploaded under a bogus business folder';
  exception when invalid_text_representation or insufficient_privilege then
    raise notice 'PASS  anon blocked from a non-existent business folder';
  end;
end
$$;
rollback;

begin;
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-00000000000a';
do $$
declare n int;
begin
  insert into storage.objects (bucket_id, name)
  values ('leadcapture-photos', '11111111-1111-4111-8111-111111111111/branding/logo.png');
  get diagnostics n = row_count;
  perform public.t_check('owner A may upload into their own folder', n::text, '1');

  begin
    insert into storage.objects (bucket_id, name)
    values ('leadcapture-photos', '22222222-2222-4222-8222-222222222222/work/x.jpg');
    raise exception 'FAIL  owner A uploaded into tenant B folder';
  exception when insufficient_privilege then
    raise notice 'PASS  owner A blocked from tenant B folder';
  end;
end
$$;
rollback;

-- ---------------------------------------------------------------------------
-- service_role — the identity the Edge Function actually runs as.
--
-- Every test above exercises anon or authenticated, so none of them would
-- ever have caught this: BYPASSRLS only skips row-level security *policy*
-- evaluation. The base GRANT/REVOKE privilege system on a custom schema is
-- separate and grants nothing automatically, so a missing grant here 403s
-- every real lead submission while every RLS test above keeps passing clean
-- — exactly how this reached a live client's site undetected.
-- ---------------------------------------------------------------------------
begin;
set local role service_role;
do $$
declare n int;
begin
  perform public.t_check('service_role can read businesses (Edge Function lookup)',
    (select count(*) from leadcapture.businesses)::text, '2');

  insert into leadcapture.leads (business_id, customer_name, phone, description, status)
  values ('11111111-1111-4111-8111-111111111111', 'Service Role Test', '27820000199', 'x', 'new');
  get diagnostics n = row_count;
  perform public.t_check('service_role can insert a lead (Edge Function write)', n::text, '1');

  update leadcapture.leads set status = 'contacted'
    where customer_name = 'Service Role Test';
  get diagnostics n = row_count;
  perform public.t_check('service_role can update a lead', n::text, '1');
end
$$;
rollback;

drop function public.t_check(text, text, text);

\echo ''
\echo '================================='
\echo ' ALL TENANT ISOLATION TESTS PASSED'
\echo '================================='
