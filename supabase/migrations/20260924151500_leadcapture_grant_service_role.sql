-- ---------------------------------------------------------------------------
-- Fix: service_role could not reach the leadcapture schema at all.
--
-- The original schema migration granted schema and table access to `anon`
-- and `authenticated`, but never to `service_role`. That went unnoticed until
-- a real lead submission actually exercised the Edge Function's business
-- lookup, which runs as service_role and hit:
--
--   permission denied for schema leadcapture
--
-- The mistake was assuming BYPASSRLS covers this. It does not — BYPASSRLS
-- only skips row-level security *policy* evaluation. The base GRANT/REVOKE
-- privilege system is enforced independently of RLS, and a custom schema
-- (unlike `public`) grants nothing automatically. Every table needs its own
-- explicit grant regardless of which roles bypass RLS.
-- ---------------------------------------------------------------------------

grant usage on schema leadcapture to service_role;

grant select, insert, update, delete on all tables in schema leadcapture to service_role;
grant usage, select on all sequences in schema leadcapture to service_role;

-- So a table added by a later migration doesn't repeat this bug.
alter default privileges in schema leadcapture
  grant select, insert, update, delete on tables to service_role;
alter default privileges in schema leadcapture
  grant usage, select on sequences to service_role;
