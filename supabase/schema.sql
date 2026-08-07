-- Carrier CRM — Supabase schema
-- Run this once in the Supabase dashboard's SQL Editor (Project → SQL Editor → New query).
--
-- Auth model: this is an internal tool, not a public site. Every user is staff, signed in
-- through Clerk (see src/proxy.ts). Rather than wiring Supabase's RLS to understand Clerk's
-- JWT (which needs extra dashboard config on both sides and is easy to get subtly wrong),
-- every read and write goes through a Next.js Route Handler that checks the Clerk session
-- server-side and then talks to Postgres with the service-role key. That's why RLS below is
-- enabled but has NO policies for anon/authenticated: the anon key (the only key ever shipped
-- to the browser) cannot read or write a single row. Only the service-role key — which never
-- leaves the server — can, and it bypasses RLS entirely. If you later want direct
-- client-side Supabase Realtime subscriptions, that requires configuring Clerk as a Supabase
-- Third-Party Auth provider and adding real policies; until then, the app polls/refetches
-- after mutations for "live enough" updates across teammates.

-- ---------------------------------------------------------------------------
-- companies — one row per carrier/manufacturer/port/warehouse lead.
-- Seeded from carriers-data.js (see scripts/seed-companies.mjs).
-- ---------------------------------------------------------------------------
create table if not exists public.companies (
  id text primary key,
  type text not null default 'carrier' check (type in ('carrier', 'manufacturer', 'port', 'warehouse')),
  name text not null,
  country text not null default '',
  region text not null default '',
  city text not null default '',
  lat double precision not null,
  lng double precision not null,

  -- Raw source fields, kept verbatim from the scrape/import — never mutated by the app.
  industries text not null default '',
  lanes text not null default '',

  -- Editable capability tags. Seeded by splitting `industries` on ';' (matching the
  -- prototype's actual loadBaseCarriers behavior — NOT `lanes`, despite the README
  -- mentioning "industries/lanes"), then freely added/removed per company afterward.
  capability_tags text[] not null default '{}',

  mulda_presence text not null default 'Does not state'
    check (mulda_presence in ('YES', 'Most likely', 'No', 'Does not state')),

  distance_km numeric,
  distance_anchor text not null default '',
  description text not null default '',
  website text not null default '',
  email text not null default '',
  phone text not null default '',
  source text not null default '',
  source_url text not null default '',

  pending_review boolean not null default true,

  -- Manager-set override score (0-100). Null means "unscored unless a route search
  -- supplies a route_score", computed client-side per search and never persisted.
  strength_score integer check (strength_score is null or (strength_score between 0 and 100)),
  strength_rationale text not null default '',

  -- Reviewed and dismissed as a false positive by staff. Duplicate detection itself
  -- (matching by normalized name/domain) runs live in the app, not stored here.
  duplicate_dismissed boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.companies enable row level security;
-- Deliberately no policies here — see the note at the top of this file.

create index if not exists companies_type_idx on public.companies (type);
create index if not exists companies_country_idx on public.companies (country);
create index if not exists companies_pending_review_idx on public.companies (pending_review) where pending_review;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists companies_set_updated_at on public.companies;
create trigger companies_set_updated_at
  before update on public.companies
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- activity_log — call/email/meeting/note entries against a company.
-- Append-only from the UI: no edit or delete of a logged entry.
-- ---------------------------------------------------------------------------
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references public.companies (id) on delete cascade,
  entry_date date not null default current_date,
  type text not null check (type in ('Call', 'Email', 'Meeting', 'Note')),
  author text not null,
  summary text not null,
  created_at timestamptz not null default now()
);

alter table public.activity_log enable row level security;
-- Deliberately no policies here — see the note at the top of this file.

create index if not exists activity_log_company_id_idx on public.activity_log (company_id);
