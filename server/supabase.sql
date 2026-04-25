create extension if not exists "pgcrypto";

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  domain text,
  created_at timestamptz not null default now()
);

create table if not exists jury_keys (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists allowed_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique
);

alter table allowed_users enable row level security;

create policy "Allow read own email"
on allowed_users
for select
using (email = auth.email());

create table if not exists scores (
  team_id uuid not null references teams(id) on delete cascade,
  round_number integer not null default 1,
  review text not null default '',
  problem_understanding numeric not null default 0,
  innovation_creativity numeric not null default 0,
  technical_implementation numeric not null default 0,
  functionality_demo numeric not null default 0,
  impact_usefulness numeric not null default 0,
  ui_ux_design numeric not null default 0,
  feasibility numeric not null default 0,
  presentation_communication numeric not null default 0,
  business_market_potential numeric not null default 0,
  testing_robustness numeric not null default 0,
  created_by_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

alter table scores
add column if not exists round_number integer not null default 1;

alter table scores
add column if not exists review text not null default '';

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'scores_pkey'
      and conrelid = 'scores'::regclass
  ) then
    alter table scores drop constraint scores_pkey;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'scores_pkey'
      and conrelid = 'scores'::regclass
  ) then
    alter table scores add constraint scores_pkey primary key (team_id, round_number);
  end if;
end $$;

create or replace view leaderboard as
select
  teams.id as team_id,
  teams.name as team_name,
  coalesce(sum(
    scores.problem_understanding
    + scores.innovation_creativity
    + scores.technical_implementation
    + scores.functionality_demo
    + scores.impact_usefulness
    + scores.ui_ux_design
    + scores.feasibility
    + scores.presentation_communication
    + scores.business_market_potential
    + scores.testing_robustness
  ), 0) as total_score
from teams
left join scores on scores.team_id = teams.id
group by teams.id, teams.name;