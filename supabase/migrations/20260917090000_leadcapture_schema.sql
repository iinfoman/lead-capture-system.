-- ---------------------------------------------------------------------------
-- Lead Capture System — core schema
--
-- This app is a tenant inside the shared "Ovibe" Supabase project, so every
-- object lives in its own `leadcapture` schema rather than `public`.
-- After running this, add `leadcapture` to Settings -> API -> Exposed schemas.
-- ---------------------------------------------------------------------------

create schema if not exists leadcapture;

-- Businesses (tenants)
create table if not exists leadcapture.businesses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  tagline text,
  about text,
  logo_url text,
  primary_color text default '#0f766e',
  secondary_color text default '#111827',
  phone text,
  whatsapp_number text,
  email text,
  service_area text,
  hours jsonb,
  google_review_link text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column leadcapture.businesses.slug is
  'Public landing page route: /:slug';
comment on column leadcapture.businesses.whatsapp_number is
  'E.164 without +, e.g. 27821234567 — used to build wa.me deep links.';

-- Owners / staff (auth users linked to a business).
-- auth.users is shared project-wide; isolation happens here via business_id.
create table if not exists leadcapture.business_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  business_id uuid references leadcapture.businesses on delete cascade not null,
  role text not null default 'owner' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now(),
  unique (user_id, business_id)
);

-- Services offered per business
create table if not exists leadcapture.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references leadcapture.businesses on delete cascade not null,
  name text not null,
  description text,
  starting_price numeric(10, 2),
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Testimonials / reviews shown on the landing page
create table if not exists leadcapture.testimonials (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references leadcapture.businesses on delete cascade not null,
  customer_name text,
  quote text,
  rating int check (rating between 1 and 5),
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- FAQs
create table if not exists leadcapture.faqs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references leadcapture.businesses on delete cascade not null,
  question text,
  answer text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Work photos (portfolio)
create table if not exists leadcapture.work_photos (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references leadcapture.businesses on delete cascade not null,
  image_url text not null,
  caption text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Leads
create table if not exists leadcapture.leads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references leadcapture.businesses on delete cascade not null,
  customer_name text not null,
  phone text not null,
  whatsapp text,
  email text,
  service_id uuid references leadcapture.services on delete set null,
  location text,
  urgency text check (urgency in ('low', 'medium', 'high', 'emergency')),
  description text,
  photo_url text,
  preferred_contact text check (preferred_contact in ('call', 'whatsapp', 'email')),
  status text not null default 'new' check (status in
    ('new', 'contacted', 'quote_sent', 'follow_up', 'booked', 'completed', 'lost')),
  quote_amount numeric(10, 2),
  follow_up_date date,
  notes text,
  source text default 'landing_page',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_business_id_idx on leadcapture.leads (business_id);
create index if not exists leads_status_idx on leadcapture.leads (status);
create index if not exists leads_created_at_idx on leadcapture.leads (created_at desc);
create index if not exists business_users_user_id_idx on leadcapture.business_users (user_id);
create index if not exists services_business_id_idx on leadcapture.services (business_id);

-- Master admins — a platform-wide role that is NOT scoped to one business.
-- Rows are inserted by hand only; there is deliberately no UI or signup path.
create table if not exists leadcapture.platform_admins (
  user_id uuid primary key references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

-- Spam control for the public lead endpoint. The Edge Function writes one row
-- per submission attempt keyed by a salted hash of the caller IP (never the
-- raw IP), then counts recent rows for that hash before allowing an insert.
create table if not exists leadcapture.lead_submission_log (
  id bigserial primary key,
  ip_hash text not null,
  business_id uuid references leadcapture.businesses on delete cascade,
  accepted boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists lead_submission_log_ip_time_idx
  on leadcapture.lead_submission_log (ip_hash, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
-- search_path is pinned here for the same reason as on the RLS helpers: a
-- mutable one lets whoever can set it influence how unqualified names inside
-- the function resolve. now() is in pg_catalog, always searched, so an empty
-- search_path is safe. Supabase's database linter flags this as
-- function_search_path_mutable if it is left unset.
create or replace function leadcapture.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists leads_set_updated_at on leadcapture.leads;
create trigger leads_set_updated_at
  before update on leadcapture.leads
  for each row execute function leadcapture.set_updated_at();

drop trigger if exists businesses_set_updated_at on leadcapture.businesses;
create trigger businesses_set_updated_at
  before update on leadcapture.businesses
  for each row execute function leadcapture.set_updated_at();

-- ---------------------------------------------------------------------------
-- Grants. RLS (next migration) is what actually restricts rows; these grants
-- only let the API roles reach the schema at all.
-- ---------------------------------------------------------------------------
grant usage on schema leadcapture to anon, authenticated;

grant select on
  leadcapture.businesses,
  leadcapture.services,
  leadcapture.testimonials,
  leadcapture.faqs,
  leadcapture.work_photos
to anon, authenticated;

grant insert on leadcapture.leads to anon, authenticated;
grant select, update, delete on leadcapture.leads to authenticated;
grant select, insert, update, delete on
  leadcapture.businesses,
  leadcapture.services,
  leadcapture.testimonials,
  leadcapture.faqs,
  leadcapture.work_photos
to authenticated;
grant select on leadcapture.business_users, leadcapture.platform_admins to authenticated;

-- bigserial sequence used by the Edge Function (service_role bypasses RLS,
-- but keep anon off the log entirely — it is written server-side only).
revoke all on leadcapture.lead_submission_log from anon, authenticated;
