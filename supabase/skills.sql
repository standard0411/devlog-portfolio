-- skills 테이블 생성
create table public.skills (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  name        text        not null,
  category    text        not null,
  level       text        not null,
  created_at  timestamptz not null default now(),
  constraint skills_category_check check (category in ('frontend', 'backend', 'db', 'devops', 'etc')),
  constraint skills_level_check    check (level    in ('learning', 'familiar', 'proficient'))
);

-- RLS 활성화
alter table public.skills enable row level security;

-- 본인 데이터만 조회/수정/삭제
create policy "own skills" on public.skills
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 인덱스
create index skills_user_id_idx    on public.skills(user_id);
create index skills_created_at_idx on public.skills(created_at desc);
