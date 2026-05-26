-- projects 테이블 생성
create table public.projects (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  name        text        not null,
  description text        not null,
  role        text,
  tech_stack  text[]      not null default '{}',
  github_url  text,
  demo_url    text,
  started_at  date        not null,
  ended_at    date,
  created_at  timestamptz not null default now()
);

-- RLS 활성화
alter table public.projects enable row level security;

-- 본인 데이터만 조회/수정/삭제
create policy "own projects" on public.projects
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 인덱스
create index projects_user_id_idx    on public.projects(user_id);
create index projects_created_at_idx on public.projects(created_at desc);
