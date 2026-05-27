-- CreativeForge AI — Supabase Schema
-- Run this in the Supabase SQL editor

-- Enable extensions
create extension if not exists "uuid-ossp";

-- =========================================================
-- USERS (extends Supabase auth.users)
-- =========================================================
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'agency')),
  generations_used int not null default 0,
  generations_limit int not null default 10,
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text default 'inactive',
  subscription_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;
create policy "Users can read own profile" on public.users for select using (auth.uid() = id);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);

-- Auto-create user record on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================
-- PROJECTS
-- =========================================================
create table public.projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  name text not null,
  vertical text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;
create policy "Users manage own projects" on public.projects for all using (auth.uid() = user_id);

-- =========================================================
-- GENERATIONS
-- =========================================================
create table public.generations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete set null,
  onboarding_data jsonb not null,
  result jsonb,
  status text not null default 'pending' check (status in ('pending', 'generating', 'done', 'error')),
  is_favorite bool not null default false,
  title text,
  created_at timestamptz not null default now()
);

alter table public.generations enable row level security;
create policy "Users manage own generations" on public.generations for all using (auth.uid() = user_id);

-- =========================================================
-- SWIPE FILE (saved inspiration)
-- =========================================================
create table public.swipe_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  generation_id uuid references public.generations(id) on delete set null,
  type text not null check (type in ('hook', 'angle', 'script', 'image_prompt', 'static_ad')),
  content jsonb not null,
  notes text,
  tags text[],
  created_at timestamptz not null default now()
);

alter table public.swipe_items enable row level security;
create policy "Users manage own swipe items" on public.swipe_items for all using (auth.uid() = user_id);

-- =========================================================
-- TEAMS
-- =========================================================
create table public.teams (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  owner_id uuid references public.users(id) on delete cascade not null,
  created_at timestamptz not null default now()
);

create table public.team_members (
  team_id uuid references public.teams(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
create policy "Team members can read team" on public.teams for select
  using (id in (select team_id from public.team_members where user_id = auth.uid()));
create policy "Team members can read memberships" on public.team_members for select
  using (team_id in (select team_id from public.team_members where user_id = auth.uid()));

-- =========================================================
-- INDEXES
-- =========================================================
create index idx_generations_user_id on public.generations(user_id);
create index idx_generations_project_id on public.generations(project_id);
create index idx_swipe_items_user_id on public.swipe_items(user_id);
create index idx_projects_user_id on public.projects(user_id);
