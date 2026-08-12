-- Logiscor — Supabase schema
-- Run this once in the Supabase dashboard's SQL Editor (Project → SQL Editor → New query).
--
-- Auth model: this is an internal tool, not a public site. Every user signs in with
-- Supabase Auth (email/password — see src/contexts/AuthContext.tsx). `companies` and
-- `activity_log` still have RLS enabled with NO anon/authenticated policies: every read and
-- write on those two tables goes through a Next.js Route Handler that checks the caller's
-- Supabase session server-side (src/lib/role.ts) and then talks to Postgres with the
-- service-role key, which bypasses RLS. `profiles` (below) is the one table the browser's
-- anon key IS allowed to read directly — just its own row, so the UI can show a name/role
-- without a round trip through a Route Handler.
--
-- Role management is intentionally basic: everyone signs up as 'staff'; promoting someone to
-- 'manager' (the only role that can edit strength scores) is a manual SQL update —
--   update public.profiles set role = 'manager' where email = 'someone@example.com';
-- — there is no admin UI for this yet.

-- ---------------------------------------------------------------------------
-- profiles — one row per auth.users row. Provisioned lazily by src/lib/role.ts (an upsert on
-- the first identity check after sign-up) rather than a database trigger on auth.users — one
-- less moving part to keep in sync with the schema.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  role text not null default 'staff' check (role in ('manager', 'staff')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

-- No insert/update policy for anon/authenticated: the upsert in role.ts always runs through
-- the service-role client, which bypasses RLS.

-- ---------------------------------------------------------------------------
-- companies — one row per carrier/manufacturer/port/warehouse lead.
-- Seeded from carriers-data.js (see scripts/seed-companies.mjs).
-- ---------------------------------------------------------------------------
create table if not exists public.companies (
  id text primary key,
  type text not null default 'carrier' check (type in ('carrier', 'manufacturer', 'port', 'warehouse')),

  -- Full classification, which can include more than just `type` (a carrier that also runs
  -- warehouse services, say). `type` stays as the primary/legacy single value — used for the
  -- header badge color and sort — while `types` drives the multi-badge display, filtering, and
  -- the drawer's editable chip list. Always backfilled to at least [type].
  types text[] not null default '{}',

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

  -- Which trailer types this carrier can run (Flatbed, Reefer, Curtainside, ...). Unlike
  -- capability_tags this has no seed data at all — src/lib/trailer-types.ts ships a preset
  -- list as a starting point, unioned with whatever's actually in use across companies.
  trailer_types text[] not null default '{}',

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

  -- Row highlight color for the company list — a hex code from src/lib/row-colors.ts,
  -- or '' for no color. Unconstrained text (no CHECK), same reasoning as capability_tags.
  label_color text not null default '',

  -- Soft delete: "Delete company" sets this instead of removing the row, so a company (and
  -- its activity_log/rate_quotes, never actually touched) can be restored from the Bin view.
  -- null means active; listCompanies() filters on this being null. No auto-purge job — the
  -- Bin is manually managed (restore or permanently delete) rather than time-expiring.
  deleted_at timestamptz,

  -- Set when this row is a hub duplicate (see the "Add Hub" button in CompanyDrawer.tsx) —
  -- points at the original company. The duplicated name stays unchanged; the hub relationship
  -- is noted in `description` instead (see appendHubNote in duplicates.ts) and this column is
  -- the structured signal MapView.tsx's "show hub duplicates" toggle filters on. Null for both
  -- ordinary companies and originals themselves. on delete set null (not cascade): deleting the
  -- original shouldn't take its hubs down with it.
  hub_of text references public.companies (id) on delete set null,

  -- ISO 3166-1 alpha-2 codes for countries this carrier is known to serve routes into/out of —
  -- structured alternative to parsing free-text lane codes out of `description` (e.g.
  -- "CZ-AT-IT-SI"); see the flags column in CompanyTable.tsx and src/lib/lane-codes.ts's
  -- fallback parser for companies that don't have this filled in yet.
  countries_served text[] not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.companies enable row level security;
-- Deliberately no policies here — see the note at the top of this file.

create index if not exists companies_type_idx on public.companies (type);
create index if not exists companies_country_idx on public.companies (country);
create index if not exists companies_pending_review_idx on public.companies (pending_review) where pending_review;
create index if not exists companies_deleted_at_idx on public.companies (deleted_at);
create index if not exists companies_hub_of_idx on public.companies (hub_of) where hub_of is not null;

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

-- ---------------------------------------------------------------------------
-- rate_quotes — freight rates staff have actually received from a company for a given
-- origin/destination lane, so past quotes are on hand next time a similar lane comes up.
-- Editable from the UI (add/edit/delete) — CompanyDrawer.tsx's "Rates Received" section.
-- ---------------------------------------------------------------------------
-- Cargo/vehicle-type-shaped columns are unconstrained text (no CHECK), same approach as
-- capability_tags/trailer_types on companies: the option lists in
-- src/lib/rate-quote-options.ts drive the dropdowns, but staff can always type a custom
-- value the list hasn't caught up with yet.
create table if not exists public.rate_quotes (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references public.companies (id) on delete cascade,
  origin text not null,
  destination text not null,

  -- Progressive form fields — see CompanyDrawer.tsx's "Rates Received" section. Transport
  -- mode gates which of load_type/container_type vs vehicle_type/capacity/service_type
  -- apply; cargo_type gates whether hazmat_class is asked for.
  transport_mode text not null default '',
  load_type text not null default '',
  container_type text not null default '',
  vehicle_type text not null default '',
  capacity text not null default '',
  cargo_type text not null default '',
  hazmat_class text not null default '',
  service_type text not null default '',
  delivery_scope text not null default '',

  rate numeric,
  dem_ft text not null default '',
  notes text not null default '',

  -- Optional — null means "no expiration". CompanyDrawer.tsx shows an "Expired" badge once
  -- this date has passed.
  expires_at date,

  created_at timestamptz not null default now()
);

alter table public.rate_quotes enable row level security;
-- Deliberately no policies here — see the note at the top of this file.

create index if not exists rate_quotes_company_id_idx on public.rate_quotes (company_id);

-- ---------------------------------------------------------------------------
-- projects — group companies cooperated with on a specific freight-procurement project.
-- Own management page (ProjectsView.tsx/ProjectDrawer.tsx); companies attach via the
-- project_companies join table below.
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  status text not null default 'active'
    check (status in ('active', 'on_hold', 'completed', 'cancelled')),
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;
-- Deliberately no policies here — see the note at the top of this file.

create index if not exists projects_status_idx on public.projects (status);

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute procedure public.set_updated_at(); -- reuses the fn defined above for companies

-- ---------------------------------------------------------------------------
-- project_companies — many-to-many join between projects and companies.
-- ---------------------------------------------------------------------------
create table if not exists public.project_companies (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  company_id text not null references public.companies (id) on delete cascade,
  added_by text not null default '',
  created_at timestamptz not null default now(),
  unique (project_id, company_id)
);

alter table public.project_companies enable row level security;
-- Deliberately no policies here — see the note at the top of this file.

create index if not exists project_companies_project_id_idx on public.project_companies (project_id);
create index if not exists project_companies_company_id_idx on public.project_companies (company_id);
