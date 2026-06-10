-- ╔══════════════════════════════════════════════════════════════╗
-- ║  CyanideX — Supabase Schema                                    ║
-- ║  Multi-Modal Cyber Threat Forecasting & Intelligence OS        ║
-- ║                                                                ║
-- ║  Run in the Supabase SQL editor (or `supabase db push`).       ║
-- ║  Defines 8 core tables, role model, and Row Level Security.    ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Extensions ------------------------------------------------------
create extension if not exists "pgcrypto";

-- Enums -----------------------------------------------------------
do $$ begin
  create type cyanidex_role as enum ('Admin', 'Analyst', 'Viewer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type severity_band as enum ('Low', 'Medium', 'High', 'Critical');
exception when duplicate_object then null; end $$;

-- ╭──────────────────────────────────────────────────────────────╮
-- │ 1. users  (profile mirror of auth.users + role)              │
-- ╰──────────────────────────────────────────────────────────────╯
create table if not exists public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  role        cyanidex_role not null default 'Viewer',
  created_at  timestamptz not null default now()
);

-- ╭──────────────────────────────────────────────────────────────╮
-- │ 2. threat_signals  (raw OSINT intelligence)                  │
-- ╰──────────────────────────────────────────────────────────────╯
create table if not exists public.threat_signals (
  id          text primary key,
  category    text not null,
  headline    text not null,
  source      text,
  sector      text,
  region      text,
  city        text,
  lat         double precision,
  lon         double precision,
  severity    numeric(4,2) not null default 0,
  confidence  integer not null default 0,
  tags        text[] default '{}',
  url         text,
  first_seen  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
create index if not exists idx_signals_severity on public.threat_signals (severity desc);
create index if not exists idx_signals_region   on public.threat_signals (region);
create index if not exists idx_signals_category on public.threat_signals (category);

-- ╭──────────────────────────────────────────────────────────────╮
-- │ 3. ai_analysis  (forecast output per signal)                 │
-- ╰──────────────────────────────────────────────────────────────╯
create table if not exists public.ai_analysis (
  id                     text primary key,
  signal_id              text references public.threat_signals (id) on delete cascade,
  threat_category        text,
  severity_score         numeric(4,2),
  severity_band          severity_band,
  attack_probability     integer,
  target_sector          text,
  confidence             integer,
  recommended_mitigation text,
  executive_summary      text,
  model                  text,
  generated_at           timestamptz not null default now()
);
create index if not exists idx_ai_signal on public.ai_analysis (signal_id);

-- ╭──────────────────────────────────────────────────────────────╮
-- │ 4. voice_commands  (transcripts + matched intents)           │
-- ╰──────────────────────────────────────────────────────────────╯
create table if not exists public.voice_commands (
  id          text primary key,
  user_id     uuid references public.users (id) on delete set null,
  transcript  text not null,
  intent      text,
  response    text,
  confidence  integer,
  matched_at  timestamptz not null default now()
);

-- ╭──────────────────────────────────────────────────────────────╮
-- │ 5. incident_reports                                          │
-- ╰──────────────────────────────────────────────────────────────╯
create table if not exists public.incident_reports (
  id            text primary key,
  signal_id     text references public.threat_signals (id) on delete set null,
  title         text not null,
  status        text not null default 'Open',
  severity_band severity_band,
  timeline      jsonb default '[]',
  analyst       text,
  opened_at     timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

-- ╭──────────────────────────────────────────────────────────────╮
-- │ 6. risk_dna                                                  │
-- ╰──────────────────────────────────────────────────────────────╯
create table if not exists public.risk_dna (
  id                 text primary key,
  signal_id          text references public.threat_signals (id) on delete cascade,
  origin             text,
  motivation         text,
  attack_method      text,
  affected_industry  text,
  timeline           text,
  confidence_score   integer,
  possible_impact    text,
  mitigation_strategy text,
  dna_strands        jsonb default '[]',
  created_at         timestamptz not null default now()
);

-- ╭──────────────────────────────────────────────────────────────╮
-- │ 7. system_logs  (audit trail)                                │
-- ╰──────────────────────────────────────────────────────────────╯
create table if not exists public.system_logs (
  id         bigint generated always as identity primary key,
  user_id    uuid references public.users (id) on delete set null,
  level      text not null default 'info',
  event      text not null,
  detail     jsonb default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_logs_created on public.system_logs (created_at desc);

-- ╭──────────────────────────────────────────────────────────────╮
-- │ 8. executive_briefings                                       │
-- ╰──────────────────────────────────────────────────────────────╯
create table if not exists public.executive_briefings (
  id                       text primary key,
  title                    text not null,
  headline                 text,
  top_threats              jsonb default '[]',
  most_targeted_industries jsonb default '[]',
  heatmap_summary          jsonb default '[]',
  predicted_attacks        jsonb default '[]',
  recommended_actions      jsonb default '[]',
  war_room_summary         text,
  generated_at             timestamptz not null default now()
);

-- ╭──────────────────────────────────────────────────────────────╮
-- │ Auto-provision a profile row when a new auth user signs up.  │
-- ╰──────────────────────────────────────────────────────────────╯
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'Viewer'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: current user's role -------------------------------------
-- Named cx_user_role to avoid shadowing Postgres' built-in current_role().
create or replace function public.cx_user_role()
returns cyanidex_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.users where id = auth.uid();
$$;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Row Level Security                                            ║
-- ║  Viewer  : read intelligence                                  ║
-- ║  Analyst : read + create incidents / voice / logs             ║
-- ║  Admin   : full access                                        ║
-- ╚══════════════════════════════════════════════════════════════╝
alter table public.users               enable row level security;
alter table public.threat_signals      enable row level security;
alter table public.ai_analysis         enable row level security;
alter table public.voice_commands      enable row level security;
alter table public.incident_reports    enable row level security;
alter table public.risk_dna            enable row level security;
alter table public.system_logs         enable row level security;
alter table public.executive_briefings enable row level security;

-- users: a person can read/update their own profile; Admin reads all
create policy "users_self_select" on public.users
  for select to authenticated using (id = auth.uid() or public.cx_user_role() = 'Admin');
create policy "users_self_update" on public.users
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Intelligence tables: any authenticated role may read
create policy "intel_read_signals" on public.threat_signals
  for select to authenticated using (true);
create policy "intel_read_ai" on public.ai_analysis
  for select to authenticated using (true);
create policy "intel_read_dna" on public.risk_dna
  for select to authenticated using (true);
create policy "intel_read_briefings" on public.executive_briefings
  for select to authenticated using (true);
create policy "intel_read_incidents" on public.incident_reports
  for select to authenticated using (true);

-- Analyst/Admin may write intelligence + incidents
create policy "intel_write_signals" on public.threat_signals
  for insert to authenticated with check (public.cx_user_role() in ('Analyst', 'Admin'));
create policy "intel_write_incidents" on public.incident_reports
  for insert to authenticated with check (public.cx_user_role() in ('Analyst', 'Admin'));
create policy "intel_write_briefings" on public.executive_briefings
  for insert to authenticated with check (public.cx_user_role() in ('Analyst', 'Admin'));

-- Voice commands: owned by the user that issued them
create policy "voice_owner_rw" on public.voice_commands
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- System logs: readable by Admin, insertable by any authenticated session
create policy "logs_admin_read" on public.system_logs
  for select to authenticated using (public.cx_user_role() = 'Admin');
create policy "logs_insert" on public.system_logs
  for insert to authenticated with check (true);
