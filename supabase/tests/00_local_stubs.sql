-- Local stand-ins for the objects Supabase provides in a real project.
-- These are TEST-ONLY scaffolding so the app's own migrations can be verified.

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema if not exists auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique
);

-- Supabase derives auth.uid() from the request JWT; locally we drive it with
-- a session setting so tests can "log in" as different users.
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create schema if not exists storage;
create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets,
  name text,
  owner uuid
);
alter table storage.objects enable row level security;

-- Matches Supabase: the folder segments of a path, excluding the filename.
create or replace function storage.foldername(name text) returns text[]
language plpgsql immutable as $$
declare
  parts text[];
begin
  parts := string_to_array(name, '/');
  return parts[1:array_length(parts, 1) - 1];
end;
$$;

grant usage on schema auth, storage to anon, authenticated, service_role;
grant select on auth.users to anon, authenticated, service_role;

-- Supabase ships these grants on the storage tables; RLS is what restricts
-- rows. Without them the storage policies below would never be reached.
grant select on storage.buckets to anon, authenticated, service_role;
grant select, insert, update, delete on storage.objects
  to anon, authenticated, service_role;
