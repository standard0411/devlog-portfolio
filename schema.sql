-- ================================================================
-- DevLog Portfolio — Supabase Database Schema
-- ================================================================
-- 실행 방법:
--   Supabase Dashboard → SQL Editor → New query → 붙여넣기 → Run
-- ================================================================

-- ----------------------------------------------------------------
-- 1. 공부 기록 테이블 (logs)
-- ----------------------------------------------------------------
create table public.logs (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  title       text        not null,
  category    text        not null check (category in ('cs', 'trend', 'etc')),
  content     text        not null,
  tags        text[]      not null default '{}',
  learned_at  date        not null,
  created_at  timestamptz not null default now()
);

-- RLS(행 수준 보안) 활성화: 자신의 데이터만 CRUD 가능
alter table public.logs enable row level security;

create policy "logs_select" on public.logs
  for select using (auth.uid() = user_id);

create policy "logs_insert" on public.logs
  for insert with check (auth.uid() = user_id);

create policy "logs_update" on public.logs
  for update using (auth.uid() = user_id);

create policy "logs_delete" on public.logs
  for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- 2. 프로젝트 기록 테이블 (projects)
-- ----------------------------------------------------------------
create table public.projects (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  name        text        not null,
  description text        not null,
  role        text,
  tech_stack  text[]      not null default '{}',
  github_url  text,
  demo_url    text,
  started_at  date,
  ended_at    date,
  created_at  timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "projects_select" on public.projects
  for select using (auth.uid() = user_id);

create policy "projects_insert" on public.projects
  for insert with check (auth.uid() = user_id);

create policy "projects_update" on public.projects
  for update using (auth.uid() = user_id);

create policy "projects_delete" on public.projects
  for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------
-- 3. 기술 스택 테이블 (skills)
-- ----------------------------------------------------------------
create table public.skills (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  name       text        not null,
  category   text        not null check (category in ('frontend', 'backend', 'db', 'devops', 'etc')),
  level      text        not null check (level in ('learning', 'familiar', 'proficient')),
  created_at timestamptz not null default now()
);

alter table public.skills enable row level security;

create policy "skills_select" on public.skills
  for select using (auth.uid() = user_id);

create policy "skills_insert" on public.skills
  for insert with check (auth.uid() = user_id);

create policy "skills_update" on public.skills
  for update using (auth.uid() = user_id);

create policy "skills_delete" on public.skills
  for delete using (auth.uid() = user_id);
