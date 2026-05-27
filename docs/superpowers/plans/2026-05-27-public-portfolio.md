# Public Portfolio Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/u/[username]` 공개 포트폴리오 URL 추가 — 비인증 접근 가능, CV 스타일, ISR 캐시, 설정 페이지에서 공개/비공개 제어

**Architecture:** Supabase `profiles` 테이블 + RLS로 공개 여부 제어. 신규 `(public)` route group으로 인증 없는 공개 페이지 서빙. `buildPortfolioData` 추상화로 dashboard/public page 양쪽에서 동일 데이터 레이어 사용. Server Action 마다 `revalidatePortfolio` 호출로 ISR on-demand revalidation.

**Tech Stack:** Next.js 16.2.6 App Router, React 19 `useActionState`, Supabase SSR (`@supabase/ssr`), Tailwind CSS v4

---

## File Map

**New files:**
- `src/lib/portfolio/types.ts` — `PortfolioProfile`, `PortfolioData` 인터페이스
- `src/lib/supabase/public.ts` — 쿠키 없는 anon 클라이언트 (공개 페이지용)
- `src/lib/username.ts` — `RESERVED`, `deriveBase`, `generateUniqueUsername`
- `src/lib/profile.ts` — `ensureProfile` (회원가입/로그인 호출)
- `src/lib/portfolio/buildPortfolioData.ts` — profile+projects+skills+logs 병렬 조회
- `src/lib/portfolio/revalidatePortfolio.ts` — is_public=true 시 revalidatePath 호출
- `src/app/(public)/u/[username]/page.tsx` — 공개 포트폴리오 (ISR, revalidate=3600)
- `src/app/(public)/u/[username]/not-found.tsx` — 404 fallback
- `src/app/(public)/u/[username]/PortfolioView.tsx` — CV-style JSX 컴포넌트
- `src/app/(dashboard)/settings/page.tsx` — 설정 페이지 (서버 컴포넌트)
- `src/app/(dashboard)/settings/SettingsForm.tsx` — 설정 폼 (클라이언트 컴포넌트)
- `src/app/(dashboard)/settings/actions.ts` — `updateProfile` Server Action
- `e2e_public_portfolio.mjs` — 공개 포트폴리오 E2E 테스트

**Modified files:**
- `src/proxy.ts` — `/u/` 경로 인증 제외
- `src/app/(auth)/signup/actions.ts` — `ensureProfile` 호출
- `src/app/(auth)/login/actions.ts` — self-healing `ensureProfile` 호출
- `src/app/(dashboard)/portfolio/generateMarkdown.ts` — `PortfolioData` 시그니처
- `src/app/(dashboard)/portfolio/page.tsx` — `buildPortfolioData` 로 교체
- `src/app/(dashboard)/projects/actions.ts` — `revalidatePortfolio` 추가
- `src/app/(dashboard)/skills/actions.ts` — `revalidatePortfolio` 추가
- `src/app/(dashboard)/layout.tsx` — 설정 nav 링크 추가

---

## Task 1: DB Migration — profiles table + trigger

**Files:**
- Apply SQL via Supabase MCP `apply_migration` tool or Supabase SQL Editor

- [ ] **Step 1: Apply the following migration SQL**

  Migration name (for MCP): `create_profiles_table`

  ```sql
  -- profiles 테이블
  create table profiles (
    user_id      uuid primary key references auth.users(id) on delete cascade,
    username     text unique not null,
    display_name text,
    bio          text,
    github_url   text,
    website_url  text,
    is_public    boolean not null default false,
    updated_at   timestamptz not null default now()
  );

  -- username 형식 제약
  alter table profiles
    add constraint profiles_username_format
    check (username ~ '^[a-z0-9-]{3,30}$');

  -- updated_at 자동 갱신 트리거
  create or replace function set_updated_at()
  returns trigger language plpgsql as $$
  begin
    new.updated_at = now();
    return new;
  end;
  $$;

  create trigger profiles_updated_at
  before update on profiles
  for each row execute procedure set_updated_at();
  ```

- [ ] **Step 2: Verify the table was created**

  Supabase SQL Editor에서 실행:
  ```sql
  select column_name, data_type, is_nullable
  from information_schema.columns
  where table_name = 'profiles'
  order by ordinal_position;
  ```
  Expected: `user_id`, `username`, `display_name`, `bio`, `github_url`, `website_url`, `is_public`, `updated_at` 컬럼 존재

- [ ] **Step 3: Verify trigger fires**

  ```sql
  -- 실제 auth.users UUID 필요 없이 트리거 함수만 확인
  select routine_name from information_schema.routines
  where routine_name = 'set_updated_at';
  ```
  Expected: 1 row

---

## Task 2: DB Migration — backfill existing users

**Files:**
- Apply SQL via Supabase MCP or Supabase SQL Editor

- [ ] **Step 1: Apply backfill SQL**

  Migration name: `backfill_profiles_for_existing_users`

  ```sql
  -- 기존 auth.users 전체에 대해 profiles 행 생성
  -- email local-part → slug → username (충돌 시 suffix 증가)
  do $$
  declare
    r record;
    base_slug text;
    candidate text;
    suffix_n  int;
  begin
    for r in select id, email from auth.users loop
      -- email이 null인 경우 스킵 (OAuth 등)
      if r.email is null then continue; end if;

      -- local-part 추출 후 slug 변환
      base_slug := lower(split_part(r.email, '@', 1));
      base_slug := regexp_replace(base_slug, '[^a-z0-9]', '-', 'g');
      base_slug := regexp_replace(base_slug, '-+', '-', 'g');
      base_slug := trim(both '-' from base_slug);
      base_slug := left(base_slug, 28);
      base_slug := coalesce(nullif(base_slug, ''), 'user');

      -- 예약어 처리
      if base_slug = any(array['admin','api','login','signup','logout',
                               'settings','u','health','portfolio',
                               'logs','projects','skills']) then
        base_slug := base_slug || '-dev';
      end if;

      -- 이미 profiles 행 있으면 스킵
      if exists (select 1 from profiles where user_id = r.id) then
        continue;
      end if;

      -- 충돌 해결 후 INSERT
      candidate := base_slug;
      suffix_n  := 2;
      loop
        begin
          insert into profiles (user_id, username)
          values (r.id, candidate);
          exit; -- 성공 시 루프 종료
        exception when unique_violation then
          candidate := base_slug || suffix_n::text;
          suffix_n  := suffix_n + 1;
        end;
      end loop;
    end loop;
  end $$;
  ```

- [ ] **Step 2: Verify backfill result**

  ```sql
  select
    (select count(*) from auth.users) as total_users,
    (select count(*) from profiles)   as total_profiles;
  ```
  Expected: 두 숫자 일치 (email 없는 OAuth 계정 제외)

---

## Task 3: DB Migration — RLS policies + anon verification

**Files:**
- Apply SQL via Supabase MCP or Supabase SQL Editor

- [ ] **Step 1: Enable RLS and apply policies**

  Migration name: `profiles_and_content_rls`

  ```sql
  -- profiles RLS 활성화
  alter table profiles enable row level security;

  -- 본인 full access
  create policy "profiles_owner"
    on profiles for all
    using (auth.uid() = user_id);

  -- is_public=true 행 public read (anon 포함)
  create policy "profiles_public_read"
    on profiles for select
    using (is_public = true);

  -- projects public read (is_public=true owner의 행)
  drop policy if exists "projects_select" on projects;
  create policy "projects_select"
    on projects for select
    using (
      auth.uid() = user_id or
      exists (
        select 1 from profiles
        where profiles.user_id = projects.user_id
          and profiles.is_public = true
      )
    );

  -- skills public read
  drop policy if exists "skills_select" on skills;
  create policy "skills_select"
    on skills for select
    using (
      auth.uid() = user_id or
      exists (
        select 1 from profiles
        where profiles.user_id = skills.user_id
          and profiles.is_public = true
      )
    );

  -- logs public read
  drop policy if exists "logs_select" on logs;
  create policy "logs_select"
    on logs for select
    using (
      auth.uid() = user_id or
      exists (
        select 1 from profiles
        where profiles.user_id = logs.user_id
          and profiles.is_public = true
      )
    );
  ```

  > **주의:** 기존 projects/skills/logs SELECT 정책 이름이 다르면 `drop policy if exists` 이름을 실제 정책 이름에 맞게 수정. Supabase 대시보드 → Authentication → Policies에서 확인.

- [ ] **Step 2: Verify anon cannot read is_public=false profiles**

  Supabase SQL Editor에서 실행 (anon role 시뮬레이션):
  ```sql
  set role anon;
  select count(*) from profiles where is_public = false;
  reset role;
  ```
  Expected: `0` (RLS가 anon의 is_public=false 조회를 차단)

- [ ] **Step 3: Set a test profile to is_public=true and verify anon can read it**

  ```sql
  -- 테스트용: 첫 번째 profiles 행을 임시로 is_public=true 로 설정
  update profiles set is_public = true where user_id = (select user_id from profiles limit 1);

  set role anon;
  select username from profiles where is_public = true;
  reset role;

  -- 테스트 후 복구
  update profiles set is_public = false;
  ```
  Expected: `set role anon` 후 username이 조회됨

- [ ] **Step 4: Commit note**

  DB migration은 Supabase에 직접 적용되므로 git commit 불필요. 다음 Task로 진행.

---

## Task 4: TypeScript — src/lib/portfolio/types.ts

**Files:**
- Create: `src/lib/portfolio/types.ts`

- [ ] **Step 1: Create the file**

  ```ts
  import type { Project, Skill, Log } from '@/types'

  export interface PortfolioProfile {
    username: string
    display_name: string | null
    bio: string | null
    github_url: string | null
    website_url: string | null
  }

  export interface PortfolioData {
    profile: PortfolioProfile
    projects: Project[]
    skills: Skill[]
    logs: Log[]
  }
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  npm run build 2>&1 | tail -5
  ```
  Expected: no errors (or same errors as before this task)

- [ ] **Step 3: Commit**

  ```bash
  git add src/lib/portfolio/types.ts
  git commit -m "feat: add PortfolioData and PortfolioProfile types"
  ```

---

## Task 5: TypeScript — src/lib/supabase/public.ts

**Files:**
- Create: `src/lib/supabase/public.ts`

- [ ] **Step 1: Create the file**

  쿠키 없는 anon 클라이언트 — 공개 페이지에서 RLS가 anon role로 동작.

  ```ts
  import { createClient } from '@supabase/supabase-js'

  export function createPublicClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

    if (!url.startsWith('https://') || !key) {
      throw new Error(
        'Supabase 환경변수가 설정되지 않았습니다.',
      )
    }

    return createClient(url, key)
  }
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  npm run build 2>&1 | tail -5
  ```
  Expected: no new errors

- [ ] **Step 3: Commit**

  ```bash
  git add src/lib/supabase/public.ts
  git commit -m "feat: add createPublicClient for unauthenticated Supabase access"
  ```

---

## Task 6: TypeScript — src/lib/username.ts

**Files:**
- Create: `src/lib/username.ts`

- [ ] **Step 1: Create the file**

  ```ts
  import type { SupabaseClient } from '@supabase/supabase-js'

  export const RESERVED = [
    'admin', 'api', 'login', 'signup', 'logout',
    'settings', 'u', 'health', 'portfolio', 'logs', 'projects', 'skills',
  ]

  export function deriveBase(email: string): string {
    const local = email.split('@')[0]
    const slug = local
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
    const trimmed = (slug || 'user').slice(0, 28)
    const clean = trimmed.replace(/^-|-$/g, '') || 'user'
    return RESERVED.includes(clean) ? `${clean}-dev` : clean
  }

  export async function generateUniqueUsername(
    email: string,
    supabase: SupabaseClient,
  ): Promise<string> {
    const base = deriveBase(email)
    let candidate = base
    let suffix = 2
    for (;;) {
      const { data } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('username', candidate)
        .maybeSingle()
      if (!data) return candidate
      candidate = `${base}${suffix++}`
    }
  }
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  npm run build 2>&1 | tail -5
  ```
  Expected: no new errors

- [ ] **Step 3: Commit**

  ```bash
  git add src/lib/username.ts
  git commit -m "feat: add username derivation and uniqueness generation"
  ```

---

## Task 7: TypeScript — src/lib/profile.ts (ensureProfile)

**Files:**
- Create: `src/lib/profile.ts`

- [ ] **Step 1: Create the file**

  ```ts
  import type { SupabaseClient } from '@supabase/supabase-js'
  import { generateUniqueUsername } from './username'

  export async function ensureProfile(
    userId: string,
    email: string,
    supabase: SupabaseClient,
  ): Promise<void> {
    const { data: existing } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) return

    const username = await generateUniqueUsername(email, supabase)

    // upsert with ignoreDuplicates handles concurrent calls for same user_id
    const { error } = await supabase
      .from('profiles')
      .upsert({ user_id: userId, username }, { onConflict: 'user_id', ignoreDuplicates: true })

    if (error) throw error

    // Verify row exists — detects username conflict (different user_id inserted same username)
    const { data: created } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (!created) throw new Error('프로필 생성에 실패했습니다.')
  }
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  npm run build 2>&1 | tail -5
  ```
  Expected: no new errors

- [ ] **Step 3: Commit**

  ```bash
  git add src/lib/profile.ts
  git commit -m "feat: add ensureProfile for idempotent profile creation"
  ```

---

## Task 8: TypeScript — src/lib/portfolio/buildPortfolioData.ts

**Files:**
- Create: `src/lib/portfolio/buildPortfolioData.ts`

- [ ] **Step 1: Create the file**

  ```ts
  import type { SupabaseClient } from '@supabase/supabase-js'
  import type { PortfolioData } from './types'
  import type { Project, Skill, Log } from '@/types'

  export async function buildPortfolioData(
    supabase: SupabaseClient,
    userId: string,
  ): Promise<PortfolioData | null> {
    const [profileResult, projectsResult, skillsResult, logsResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('username, display_name, bio, github_url, website_url')
        .eq('user_id', userId)
        .single(),
      supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false }),
      supabase
        .from('skills')
        .select('*')
        .eq('user_id', userId)
        .order('category', { ascending: true })
        .order('created_at', { ascending: true }),
      supabase
        .from('logs')
        .select('*')
        .eq('user_id', userId)
        .order('learned_at', { ascending: false })
        .limit(10),
    ])

    if (!profileResult.data) return null

    return {
      profile: profileResult.data,
      projects: (projectsResult.data ?? []) as Project[],
      skills: (skillsResult.data ?? []) as Skill[],
      logs: (logsResult.data ?? []) as Log[],
    }
  }
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  npm run build 2>&1 | tail -5
  ```
  Expected: no new errors

- [ ] **Step 3: Commit**

  ```bash
  git add src/lib/portfolio/buildPortfolioData.ts
  git commit -m "feat: add buildPortfolioData for parallel portfolio data fetching"
  ```

---

## Task 9: TypeScript — src/lib/portfolio/revalidatePortfolio.ts

**Files:**
- Create: `src/lib/portfolio/revalidatePortfolio.ts`

- [ ] **Step 1: Create the file**

  ```ts
  import { revalidatePath } from 'next/cache'
  import type { SupabaseClient } from '@supabase/supabase-js'

  export async function revalidatePortfolio(
    userId: string,
    supabase: SupabaseClient,
  ): Promise<void> {
    const { data } = await supabase
      .from('profiles')
      .select('username, is_public')
      .eq('user_id', userId)
      .single()

    if (data?.is_public && data?.username) {
      revalidatePath(`/u/${data.username}`, 'page')
    }
  }
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  npm run build 2>&1 | tail -5
  ```
  Expected: no new errors

- [ ] **Step 3: Commit**

  ```bash
  git add src/lib/portfolio/revalidatePortfolio.ts
  git commit -m "feat: add revalidatePortfolio for on-demand ISR cache busting"
  ```

---

## Task 10: Public route — (public)/u/[username]/

**Files:**
- Create: `src/app/(public)/u/[username]/not-found.tsx`
- Create: `src/app/(public)/u/[username]/PortfolioView.tsx`
- Create: `src/app/(public)/u/[username]/page.tsx`

`(public)` route group은 dashboard layout 없이 root layout만 상속. URL은 `/u/[username]`.

- [ ] **Step 1: Create not-found.tsx**

  ```tsx
  import Link from 'next/link'

  export default function NotFound() {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-zinc-500 text-sm mb-4">포트폴리오를 찾을 수 없습니다.</p>
          <Link href="/" className="text-indigo-400 hover:text-indigo-300 text-sm">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 2: Create PortfolioView.tsx**

  ```tsx
  import type { PortfolioData } from '@/lib/portfolio/types'
  import type { SkillCategory } from '@/types'

  const SKILL_CATEGORY_LABELS: Record<SkillCategory, string> = {
    frontend: '프론트엔드',
    backend: '백엔드',
    db: '데이터베이스',
    devops: 'DevOps',
    etc: '기타',
  }

  const SKILL_CATEGORY_ORDER: SkillCategory[] = ['frontend', 'backend', 'db', 'devops', 'etc']

  export default function PortfolioView({ data }: { data: PortfolioData }) {
    const { profile, projects, skills, logs } = data

    const groupedSkills = SKILL_CATEGORY_ORDER.reduce<Record<SkillCategory, typeof skills>>(
      (acc, cat) => { acc[cat] = skills.filter((s) => s.category === cat); return acc },
      { frontend: [], backend: [], db: [], devops: [], etc: [] },
    )

    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <div className="max-w-3xl mx-auto py-12 px-6">

          {/* Header */}
          <header className="mb-12">
            <h1 className="text-3xl font-bold mb-2">
              {profile.display_name ?? profile.username}
            </h1>
            {profile.bio && (
              <p className="text-zinc-400 text-sm leading-relaxed mb-4">{profile.bio}</p>
            )}
            <div className="flex gap-4 text-sm">
              {profile.github_url && (
                <a
                  href={profile.github_url}
                  className="text-zinc-400 hover:text-white transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub ↗
                </a>
              )}
              {profile.website_url && (
                <a
                  href={profile.website_url}
                  className="text-zinc-400 hover:text-white transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Website ↗
                </a>
              )}
            </div>
          </header>

          {/* Projects */}
          <section className="mb-12">
            <h2 className="text-lg font-semibold mb-5 pb-2 border-b border-zinc-800">
              프로젝트 ({projects.length})
            </h2>
            {projects.length === 0 ? (
              <p className="text-zinc-500 text-sm">등록된 프로젝트가 없습니다.</p>
            ) : (
              <div className="space-y-8">
                {projects.map((p) => (
                  <article key={p.id}>
                    <div className="flex items-start justify-between gap-4 mb-1">
                      <h3 className="font-semibold">{p.name}</h3>
                      <span className="text-xs text-zinc-500 shrink-0 mt-0.5">
                        {p.started_at} – {p.ended_at ?? '진행 중'}
                      </span>
                    </div>
                    {p.role && (
                      <p className="text-xs text-zinc-500 mb-2">{p.role}</p>
                    )}
                    <p className="text-sm text-zinc-300 leading-relaxed mb-3">
                      {p.description}
                    </p>
                    {p.tech_stack.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {p.tech_stack.map((t) => (
                          <span
                            key={t}
                            className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-3 text-xs text-zinc-500">
                      {p.github_url && (
                        <a
                          href={p.github_url}
                          className="hover:text-white transition-colors"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          GitHub ↗
                        </a>
                      )}
                      {p.demo_url && (
                        <a
                          href={p.demo_url}
                          className="hover:text-white transition-colors"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Demo ↗
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* Skills */}
          <section className="mb-12">
            <h2 className="text-lg font-semibold mb-5 pb-2 border-b border-zinc-800">
              기술 스택
            </h2>
            {skills.length === 0 ? (
              <p className="text-zinc-500 text-sm">등록된 기술이 없습니다.</p>
            ) : (
              <div className="space-y-4">
                {SKILL_CATEGORY_ORDER.filter((cat) => groupedSkills[cat].length > 0).map((cat) => (
                  <div key={cat}>
                    <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
                      {SKILL_CATEGORY_LABELS[cat]}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {groupedSkills[cat].map((s) => (
                        <span
                          key={s.id}
                          className="text-sm bg-zinc-800 text-zinc-200 px-3 py-1 rounded-full"
                        >
                          {s.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent Logs */}
          {logs.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-5 pb-2 border-b border-zinc-800">
                최근 학습 기록 ({logs.length})
              </h2>
              <div className="space-y-5">
                {logs.map((log) => (
                  <article key={log.id}>
                    <div className="flex items-baseline gap-2 mb-1">
                      <h3 className="font-medium text-sm">{log.title}</h3>
                      <span className="text-xs text-zinc-500">{log.learned_at}</span>
                    </div>
                    <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3">
                      {log.content}
                    </p>
                    {log.tags.length > 0 && (
                      <div className="flex gap-2 mt-1">
                        {log.tags.map((t) => (
                          <span key={t} className="text-xs text-zinc-600">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}

        </div>
      </div>
    )
  }
  ```

- [ ] **Step 3: Create page.tsx**

  ```tsx
  import { notFound } from 'next/navigation'
  import type { Metadata } from 'next'
  import { createPublicClient } from '@/lib/supabase/public'
  import { buildPortfolioData } from '@/lib/portfolio/buildPortfolioData'
  import PortfolioView from './PortfolioView'

  export const revalidate = 3600

  type Props = { params: Promise<{ username: string }> }

  async function fetchProfile(username: string) {
    const supabase = createPublicClient()
    const { data } = await supabase
      .from('profiles')
      .select('user_id, display_name, bio')
      .eq('username', username)
      .single()
    return data
  }

  export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { username } = await params
    const profile = await fetchProfile(username)
    if (!profile) return { title: '포트폴리오를 찾을 수 없습니다' }
    return {
      title: `${profile.display_name ?? username}의 포트폴리오`,
      description: profile.bio ?? `${username}의 개발 포트폴리오`,
    }
  }

  export default async function PublicPortfolioPage({ params }: Props) {
    const { username } = await params
    const supabase = createPublicClient()

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('username', username)
      .single()

    if (!profile) notFound()

    const data = await buildPortfolioData(supabase, profile.user_id)
    if (!data) notFound()

    return <PortfolioView data={data} />
  }
  ```

- [ ] **Step 4: Verify TypeScript compiles**

  ```bash
  npm run build 2>&1 | tail -10
  ```
  Expected: no new errors

- [ ] **Step 5: Commit**

  ```bash
  git add "src/app/(public)"
  git commit -m "feat: add public portfolio page at /u/[username]"
  ```

---

## Task 11: Settings — actions.ts

**Files:**
- Create: `src/app/(dashboard)/settings/actions.ts`

- [ ] **Step 1: Create the file**

  ```ts
  'use server'

  import { revalidatePath } from 'next/cache'
  import { redirect } from 'next/navigation'
  import { createClient } from '@/lib/supabase/server'
  import { RESERVED } from '@/lib/username'

  export type SettingsState = { error: string } | null

  export async function updateProfile(
    prevState: SettingsState,
    formData: FormData,
  ): Promise<SettingsState> {
    const username = (formData.get('username') as string).trim().toLowerCase()
    const displayName = (formData.get('display_name') as string).trim() || null
    const bio = (formData.get('bio') as string).trim() || null
    const githubUrl = (formData.get('github_url') as string).trim() || null
    const websiteUrl = (formData.get('website_url') as string).trim() || null
    // checkbox: 'true' when checked, null when unchecked
    const isPublic = formData.get('is_public') === 'true'

    if (!username || !/^[a-z0-9-]{3,30}$/.test(username)) {
      return { error: '사용자명은 소문자 영문, 숫자, 하이픈으로 3~30자여야 합니다.' }
    }
    if (RESERVED.includes(username)) {
      return { error: '사용할 수 없는 사용자명입니다.' }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: '로그인이 필요합니다.' }

    // Fetch current profile for old username (revalidation)
    const { data: oldProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('user_id', user.id)
      .single()

    const { error } = await supabase
      .from('profiles')
      .update({ username, display_name: displayName, bio, github_url: githubUrl, website_url: websiteUrl, is_public: isPublic })
      .eq('user_id', user.id)

    if (error) {
      if (error.code === '23505') return { error: '이미 사용 중인 사용자명입니다.' }
      return { error: '저장에 실패했습니다. 잠시 후 다시 시도해주세요.' }
    }

    // Revalidate old and new public portfolio URLs
    if (oldProfile?.username) revalidatePath(`/u/${oldProfile.username}`, 'page')
    revalidatePath(`/u/${username}`, 'page')

    redirect('/settings')
  }
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  npm run build 2>&1 | tail -5
  ```
  Expected: no new errors

- [ ] **Step 3: Commit**

  ```bash
  git add "src/app/(dashboard)/settings/actions.ts"
  git commit -m "feat: add updateProfile server action with username revalidation"
  ```

---

## Task 12: Settings — SettingsForm.tsx + page.tsx

**Files:**
- Create: `src/app/(dashboard)/settings/SettingsForm.tsx`
- Create: `src/app/(dashboard)/settings/page.tsx`

- [ ] **Step 1: Create SettingsForm.tsx**

  ```tsx
  'use client'

  import { useActionState } from 'react'
  import { updateProfile } from './actions'
  import type { SettingsState } from './actions'

  const inputClass =
    'w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors'

  interface ProfileData {
    username: string
    display_name: string | null
    bio: string | null
    github_url: string | null
    website_url: string | null
    is_public: boolean
  }

  export default function SettingsForm({ profile }: { profile: ProfileData | null }) {
    const [state, formAction, isPending] = useActionState<SettingsState, FormData>(
      updateProfile,
      null,
    )

    return (
      <form action={formAction} className="space-y-5 max-w-lg">

        {/* username */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">
            사용자명 (공개 URL)
          </label>
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500 text-sm">/u/</span>
            <input
              name="username"
              defaultValue={profile?.username ?? ''}
              required
              placeholder="your-username"
              className={inputClass}
            />
          </div>
          <p className="text-xs text-zinc-600 mt-1">소문자 영문, 숫자, 하이픈 · 3~30자</p>
        </div>

        {/* display_name */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">표시 이름</label>
          <input
            name="display_name"
            defaultValue={profile?.display_name ?? ''}
            placeholder="홍길동"
            className={inputClass}
          />
        </div>

        {/* bio */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">소개</label>
          <textarea
            name="bio"
            defaultValue={profile?.bio ?? ''}
            rows={3}
            placeholder="간단한 자기소개"
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* github_url */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">GitHub URL</label>
          <input
            name="github_url"
            type="url"
            defaultValue={profile?.github_url ?? ''}
            placeholder="https://github.com/username"
            className={inputClass}
          />
        </div>

        {/* website_url */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">웹사이트 URL</label>
          <input
            name="website_url"
            type="url"
            defaultValue={profile?.website_url ?? ''}
            placeholder="https://yourblog.com"
            className={inputClass}
          />
        </div>

        {/* is_public */}
        <div className="flex items-center gap-3 py-2">
          <input
            type="checkbox"
            id="is_public"
            name="is_public"
            value="true"
            defaultChecked={profile?.is_public ?? false}
            className="w-4 h-4 accent-indigo-500"
          />
          <label htmlFor="is_public" className="text-sm text-zinc-300 cursor-pointer">
            포트폴리오 공개 허용
          </label>
        </div>

        {state?.error && (
          <div className="flex items-start gap-2.5 text-sm text-red-400 bg-red-950/50 border border-red-900/60 rounded-lg px-3.5 py-2.5">
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {state.error}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:opacity-70 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {isPending ? '저장 중...' : '저장하기'}
        </button>
      </form>
    )
  }
  ```

- [ ] **Step 2: Create page.tsx**

  ```tsx
  import { redirect } from 'next/navigation'
  import { createClient } from '@/lib/supabase/server'
  import SettingsForm from './SettingsForm'

  export default async function SettingsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
      .from('profiles')
      .select('username, display_name, bio, github_url, website_url, is_public')
      .eq('user_id', user.id)
      .single()

    return (
      <div>
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-white">설정</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            프로필 및 공개 포트폴리오 설정
          </p>
          {profile?.is_public && profile.username && (
            <a
              href={`/u/${profile.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-400 hover:text-indigo-300 mt-1 inline-block"
            >
              /u/{profile.username} ↗ (공개 포트폴리오)
            </a>
          )}
        </div>
        <SettingsForm profile={profile} />
      </div>
    )
  }
  ```

- [ ] **Step 3: Verify TypeScript compiles**

  ```bash
  npm run build 2>&1 | tail -10
  ```
  Expected: no new errors

- [ ] **Step 4: Commit**

  ```bash
  git add "src/app/(dashboard)/settings"
  git commit -m "feat: add settings page with profile and public toggle"
  ```

---

## Task 13: Modify proxy.ts — add /u/ bypass

**Files:**
- Modify: `src/proxy.ts`

- [ ] **Step 1: Add `/u/` to the auth bypass condition**

  현재 코드 (`src/proxy.ts:44`):
  ```ts
  if (!user && !pathname.startsWith('/login') && !pathname.startsWith('/signup') && !pathname.startsWith('/api/')) {
  ```

  변경 후:
  ```ts
  if (!user && !pathname.startsWith('/login') && !pathname.startsWith('/signup') && !pathname.startsWith('/api/') && !pathname.startsWith('/u/')) {
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  npm run build 2>&1 | tail -5
  ```
  Expected: no errors

- [ ] **Step 3: Commit**

  ```bash
  git add src/proxy.ts
  git commit -m "feat: exclude /u/ routes from auth redirect"
  ```

---

## Task 14: Modify signup/actions.ts — add ensureProfile

**Files:**
- Modify: `src/app/(auth)/signup/actions.ts`

- [ ] **Step 1: Add ensureProfile call after successful signUp**

  현재 코드 (line 28–44):
  ```ts
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) {
    if (error.message.toLowerCase().includes('already registered')) {
      return { error: '이미 사용 중인 이메일입니다.' }
    }
    return { error: '회원가입 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' }
  }

  // 이메일 인증 비활성화 시: 즉시 세션 발급 → /logs 로 이동
  if (data.session) {
    redirect('/logs')
  }

  // 이메일 인증 활성화 시: 인증 메일 발송 → 성공 화면 표시
  return { success: true }
  ```

  변경 후 (import 추가 + ensureProfile 삽입):
  ```ts
  import { ensureProfile } from '@/lib/profile'

  // ... (기존 validation 코드 유지) ...

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) {
    if (error.message.toLowerCase().includes('already registered')) {
      return { error: '이미 사용 중인 이메일입니다.' }
    }
    return { error: '회원가입 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' }
  }

  if (data.user) {
    try {
      await ensureProfile(data.user.id, email, supabase)
    } catch {
      return { error: '프로필 생성에 실패했습니다. 잠시 후 다시 시도해주세요.' }
    }
  }

  // 이메일 인증 비활성화 시: 즉시 세션 발급 → /logs 로 이동
  if (data.session) {
    redirect('/logs')
  }

  // 이메일 인증 활성화 시: 인증 메일 발송 → 성공 화면 표시
  return { success: true }
  ```

  전체 파일 (`src/app/(auth)/signup/actions.ts`) 최종 형태:
  ```ts
  'use server'

  import { createClient } from '@/lib/supabase/server'
  import { redirect } from 'next/navigation'
  import { ensureProfile } from '@/lib/profile'

  export type SignupState = {
    error?: string
    success?: boolean
  } | null

  export async function signup(prevState: SignupState, formData: FormData): Promise<SignupState> {
    const email = (formData.get('email') as string).trim()
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (!email || !password || !confirmPassword) {
      return { error: '모든 항목을 입력해주세요.' }
    }

    if (password.length < 6) {
      return { error: '비밀번호는 6자 이상이어야 합니다.' }
    }

    if (password !== confirmPassword) {
      return { error: '비밀번호가 일치하지 않습니다.' }
    }

    const supabase = await createClient()
    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
      if (error.message.toLowerCase().includes('already registered')) {
        return { error: '이미 사용 중인 이메일입니다.' }
      }
      return { error: '회원가입 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' }
    }

    if (data.user) {
      try {
        await ensureProfile(data.user.id, email, supabase)
      } catch {
        return { error: '프로필 생성에 실패했습니다. 잠시 후 다시 시도해주세요.' }
      }
    }

    if (data.session) {
      redirect('/logs')
    }

    return { success: true }
  }
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  npm run build 2>&1 | tail -5
  ```
  Expected: no new errors

- [ ] **Step 3: Commit**

  ```bash
  git add "src/app/(auth)/signup/actions.ts"
  git commit -m "feat: create profile on signup via ensureProfile"
  ```

---

## Task 15: Modify login/actions.ts — self-healing ensureProfile

**Files:**
- Modify: `src/app/(auth)/login/actions.ts`

- [ ] **Step 1: Add self-healing ensureProfile after successful login**

  전체 파일 최종 형태:
  ```ts
  'use server'

  import { createClient } from '@/lib/supabase/server'
  import { redirect } from 'next/navigation'
  import { ensureProfile } from '@/lib/profile'

  export type LoginState = {
    error: string
  } | null

  export async function login(prevState: LoginState, formData: FormData): Promise<LoginState> {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
      return { error: '이메일과 비밀번호를 입력해주세요.' }
    }

    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      return { error: '이메일 또는 비밀번호가 올바르지 않습니다.' }
    }

    // 기존 유저 중 profiles 행이 없는 경우 복구 목적 (가입 전 로그인한 계정 등)
    if (data.user) {
      try {
        await ensureProfile(data.user.id, data.user.email ?? email, supabase)
      } catch {
        // self-healing 실패는 로그인 자체를 막지 않음
      }
    }

    redirect('/logs')
  }
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  npm run build 2>&1 | tail -5
  ```
  Expected: no new errors

- [ ] **Step 3: Commit**

  ```bash
  git add "src/app/(auth)/login/actions.ts"
  git commit -m "feat: self-healing ensureProfile on login for existing users without profile"
  ```

---

## Task 16: Modify generateMarkdown.ts — PortfolioData signature

**Files:**
- Modify: `src/app/(dashboard)/portfolio/generateMarkdown.ts`

- [ ] **Step 1: Update import and function signature**

  전체 파일 최종 형태:
  ```ts
  import type { Project, Skill, Log, SkillCategory, SkillLevel } from '@/types'
  import type { PortfolioData } from '@/lib/portfolio/types'

  const SKILL_CATEGORY_LABELS: Record<SkillCategory, string> = {
    frontend: '프론트엔드',
    backend: '백엔드',
    db: '데이터베이스',
    devops: 'DevOps',
    etc: '기타',
  }

  const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
    learning: '학습 중',
    familiar: '익숙',
    proficient: '능숙',
  }

  const LOG_CATEGORY_LABELS = {
    cs: 'CS',
    trend: '트렌드',
    etc: '기타',
  } as const

  const SKILL_CATEGORY_ORDER: SkillCategory[] = ['frontend', 'backend', 'db', 'devops', 'etc']

  export function generateMarkdown(data: PortfolioData): string {
    const { profile, projects, skills, logs } = data
    const lines: string[] = []

    const name = profile.display_name ?? profile.username
    const generatedAt = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    lines.push(`# ${name} 포트폴리오`)
    lines.push('')
    lines.push(`> 생성일: ${generatedAt}`)
    lines.push('')

    // ── 프로젝트 ──
    lines.push(`## 프로젝트 (${projects.length}개)`)
    lines.push('')

    if (projects.length === 0) {
      lines.push('_등록된 프로젝트가 없습니다._')
      lines.push('')
    } else {
      for (const p of projects) {
        lines.push(`### ${p.name}`)
        lines.push('')
        lines.push(`- **기간**: ${p.started_at} ~ ${p.ended_at ?? '진행 중'}`)
        if (p.role) lines.push(`- **역할**: ${p.role}`)
        if (p.tech_stack.length > 0) lines.push(`- **기술**: ${p.tech_stack.join(', ')}`)
        if (p.github_url) lines.push(`- **GitHub**: ${p.github_url}`)
        if (p.demo_url) lines.push(`- **데모**: ${p.demo_url}`)
        lines.push('')
        lines.push(p.description.trim())
        lines.push('')
        lines.push('---')
        lines.push('')
      }
    }

    // ── 기술 스택 ──
    lines.push('## 기술 스택')
    lines.push('')

    const grouped = SKILL_CATEGORY_ORDER.reduce<Record<SkillCategory, Skill[]>>(
      (acc, cat) => {
        acc[cat] = skills.filter((s) => s.category === cat)
        return acc
      },
      { frontend: [], backend: [], db: [], devops: [], etc: [] },
    )

    const visibleCats = SKILL_CATEGORY_ORDER.filter((cat) => grouped[cat].length > 0)

    if (visibleCats.length === 0) {
      lines.push('_등록된 기술이 없습니다._')
      lines.push('')
    } else {
      for (const cat of visibleCats) {
        lines.push(`### ${SKILL_CATEGORY_LABELS[cat]}`)
        for (const s of grouped[cat]) {
          lines.push(`- ${s.name} — ${SKILL_LEVEL_LABELS[s.level]}`)
        }
        lines.push('')
      }
    }

    // ── 최근 학습 기록 ──
    lines.push(`## 최근 학습 기록 (${logs.length}개)`)
    lines.push('')

    if (logs.length === 0) {
      lines.push('_등록된 학습 기록이 없습니다._')
      lines.push('')
    } else {
      for (const log of logs) {
        lines.push(`### ${log.title} · ${log.learned_at}`)
        lines.push('')
        lines.push(`- **카테고리**: ${LOG_CATEGORY_LABELS[log.category]}`)
        if (log.tags.length > 0) {
          lines.push(`- **태그**: ${log.tags.map((t) => '#' + t).join(' ')}`)
        }
        lines.push('')
        lines.push(log.content.trim())
        lines.push('')
        lines.push('---')
        lines.push('')
      }
    }

    return lines.join('\n')
  }
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  npm run build 2>&1 | tail -5
  ```
  Expected: TypeScript error at portfolio/page.tsx (generateMarkdown signature mismatch) — **정상**, 다음 Task에서 수정

- [ ] **Step 3: Commit**

  ```bash
  git add src/app/(dashboard)/portfolio/generateMarkdown.ts
  git commit -m "refactor: update generateMarkdown to accept PortfolioData"
  ```

---

## Task 17: Modify portfolio/page.tsx — use buildPortfolioData

**Files:**
- Modify: `src/app/(dashboard)/portfolio/page.tsx`

- [ ] **Step 1: Replace inline queries with buildPortfolioData**

  전체 파일 최종 형태:
  ```tsx
  import { redirect } from 'next/navigation'
  import { createClient } from '@/lib/supabase/server'
  import { buildPortfolioData } from '@/lib/portfolio/buildPortfolioData'
  import { generateMarkdown } from './generateMarkdown'
  import MarkdownPanel from './MarkdownPanel'

  export default async function PortfolioPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const data = await buildPortfolioData(supabase, user.id)

    const markdown = data
      ? generateMarkdown(data)
      : generateMarkdown({
          profile: { username: user.email?.split('@')[0] ?? 'user', display_name: null, bio: null, github_url: null, website_url: null },
          projects: [],
          skills: [],
          logs: [],
        })

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-white">포트폴리오</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              프로젝트 {data?.projects.length ?? 0}개 · 기술 {data?.skills.length ?? 0}개 · 학습 기록 {data?.logs.length ?? 0}개
            </p>
          </div>
        </div>

        <MarkdownPanel markdown={markdown} />
      </div>
    )
  }
  ```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

  ```bash
  npm run build 2>&1 | tail -10
  ```
  Expected: 0 errors

- [ ] **Step 3: Commit**

  ```bash
  git add "src/app/(dashboard)/portfolio/page.tsx"
  git commit -m "refactor: portfolio page uses buildPortfolioData"
  ```

---

## Task 18: Wire revalidation — projects + skills actions + nav link

**Files:**
- Modify: `src/app/(dashboard)/projects/actions.ts`
- Modify: `src/app/(dashboard)/skills/actions.ts`
- Modify: `src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Add revalidatePortfolio to projects/actions.ts**

  파일 상단 import에 추가:
  ```ts
  import { revalidatePortfolio } from '@/lib/portfolio/revalidatePortfolio'
  ```

  `addProject` 함수의 `redirect('/projects')` 바로 앞에:
  ```ts
  await revalidatePortfolio(user.id, supabase)
  redirect('/projects')
  ```

  `updateProject` 함수의 `redirect(\`/projects/${id}\`)` 바로 앞에:
  ```ts
  await revalidatePortfolio(user.id, supabase)
  redirect(`/projects/${id}`)
  ```

  `deleteProject` 함수의 `redirect('/projects')` 바로 앞에:
  ```ts
  await revalidatePortfolio(user.id, supabase)
  redirect('/projects')
  ```

- [ ] **Step 2: Add revalidatePortfolio to skills/actions.ts**

  파일 상단 import에 추가:
  ```ts
  import { revalidatePortfolio } from '@/lib/portfolio/revalidatePortfolio'
  ```

  `addSkill` 함수에서 `revalidatePath('/skills')` 다음 줄에:
  ```ts
  await revalidatePortfolio(user.id, supabase)
  ```

  `updateSkill` 함수에서 `revalidatePath('/skills')` 다음 줄에:
  ```ts
  await revalidatePortfolio(user.id, supabase)
  ```

  `deleteSkill` 함수에서 `revalidatePath('/skills')` 다음 줄에:
  ```ts
  await revalidatePortfolio(user.id, supabase)
  ```

- [ ] **Step 3: Add Settings nav link to dashboard layout**

  `src/app/(dashboard)/layout.tsx` — nav section에서 `<NavLink href="/portfolio">포트폴리오</NavLink>` 다음 줄에 추가:
  ```tsx
  <NavLink href="/settings">설정</NavLink>
  ```

- [ ] **Step 4: Verify TypeScript compiles**

  ```bash
  npm run build 2>&1 | tail -10
  ```
  Expected: 0 errors

- [ ] **Step 5: Commit**

  ```bash
  git add src/app/(dashboard)/projects/actions.ts src/app/(dashboard)/skills/actions.ts src/app/(dashboard)/layout.tsx
  git commit -m "feat: revalidate public portfolio on project/skill changes; add settings nav link"
  ```

---

## Task 19: E2E test — e2e_public_portfolio.mjs

**Files:**
- Create: `e2e_public_portfolio.mjs`

- [ ] **Step 1: Create the E2E test file**

  ```js
  import { chromium } from 'playwright'

  const BASE = 'http://localhost:3000'
  const EMAIL = 'test_e2e_1779693089603@gmail.com'
  const PASSWORD = 'TestPass123!'

  async function run() {
    const browser = await chromium.launch({ headless: true })
    const context = await browser.newContext()
    const page = await context.newPage()

    let passed = 0, failed = 0
    function check(label, ok, note = '') {
      if (ok) { console.log(`  ✅ ${label}`); passed++ }
      else { console.log(`  ❌ ${label}${note ? ' — ' + note : ''}`); failed++ }
    }

    let testUsername = ''

    try {
      // ── Step 1: 로그인 ──
      console.log('\n[1] 로그인')
      await page.goto(`${BASE}/login`)
      await page.fill('input[type="email"]', EMAIL)
      await page.fill('input[type="password"]', PASSWORD)
      await page.click('button[type="submit"]')
      await page.waitForURL('**/logs', { timeout: 10000 })
      check('로그인 → /logs', page.url().includes('/logs'))

      // ── Step 2: 설정 페이지 접근 ──
      console.log('\n[2] 설정 페이지')
      await page.goto(`${BASE}/settings`)
      await page.waitForSelector('h1', { timeout: 5000 })
      const settingsBody = await page.textContent('body')
      check('/settings 접근', page.url().includes('/settings'))
      check('설정 heading 표시', settingsBody.includes('설정'))

      // 현재 username 저장
      const usernameInput = page.locator('input[name="username"]')
      testUsername = (await usernameInput.inputValue()).trim()
      check('username 입력 필드 존재', testUsername.length > 0, testUsername)

      // ── Step 3: is_public OFF 상태에서 /u/[username] → 404 ──
      console.log('\n[3] 공개 OFF → 404')
      // is_public 체크 해제 후 저장
      const checkbox = page.locator('input[name="is_public"]')
      if (await checkbox.isChecked()) {
        await checkbox.uncheck()
        await page.getByRole('button', { name: '저장하기' }).click()
        await page.waitForURL('**/settings', { timeout: 8000 })
      }

      const publicCtx = await browser.newContext()
      const publicPage = await publicCtx.newPage()
      await publicPage.goto(`${BASE}/u/${testUsername}`)
      await publicPage.waitForLoadState('networkidle')
      check('공개 OFF → 404 표시', (await publicPage.textContent('body'))?.includes('찾을 수 없') ?? false)
      await publicCtx.close()

      // ── Step 4: is_public ON 상태에서 /u/[username] → 200 ──
      console.log('\n[4] 공개 ON → 포트폴리오 접근 가능')
      await page.goto(`${BASE}/settings`)
      await page.waitForSelector('input[name="is_public"]', { timeout: 5000 })
      const cbOn = page.locator('input[name="is_public"]')
      if (!(await cbOn.isChecked())) await cbOn.check()
      await page.getByRole('button', { name: '저장하기' }).click()
      await page.waitForURL('**/settings', { timeout: 8000 })

      const publicCtx2 = await browser.newContext()
      const publicPage2 = await publicCtx2.newPage()
      await publicPage2.goto(`${BASE}/u/${testUsername}`)
      await publicPage2.waitForLoadState('networkidle')
      const pubBody = await publicPage2.textContent('body')
      check('공개 ON → 200 접근', !pubBody?.includes('찾을 수 없') ?? false)
      check('포트폴리오 이름 표시', pubBody?.includes(testUsername) ?? false, testUsername)
      await publicCtx2.close()

      // ── Step 5: username 변경 후 기존 URL 404, 새 URL 200 ──
      console.log('\n[5] username 변경')
      const newUsername = `${testUsername}-x`
      await page.goto(`${BASE}/settings`)
      await page.waitForSelector('input[name="username"]', { timeout: 5000 })
      await page.fill('input[name="username"]', newUsername)
      const cbStillOn = page.locator('input[name="is_public"]')
      if (!(await cbStillOn.isChecked())) await cbStillOn.check()
      await page.getByRole('button', { name: '저장하기' }).click()
      await page.waitForURL('**/settings', { timeout: 8000 })

      const publicCtx3 = await browser.newContext()
      const publicPage3 = await publicCtx3.newPage()

      await publicPage3.goto(`${BASE}/u/${testUsername}`)
      await publicPage3.waitForLoadState('networkidle')
      const oldBody = await publicPage3.textContent('body')
      check('기존 URL 404', oldBody?.includes('찾을 수 없') ?? false, `/u/${testUsername}`)

      await publicPage3.goto(`${BASE}/u/${newUsername}`)
      await publicPage3.waitForLoadState('networkidle')
      const newBody = await publicPage3.textContent('body')
      check('새 URL 200', !newBody?.includes('찾을 수 없') ?? false, `/u/${newUsername}`)
      await publicCtx3.close()

      // ── Step 6: username 원복 ──
      console.log('\n[6] username 원복')
      await page.goto(`${BASE}/settings`)
      await page.waitForSelector('input[name="username"]', { timeout: 5000 })
      await page.fill('input[name="username"]', testUsername)
      const cbRestore = page.locator('input[name="is_public"]')
      if (!(await cbRestore.isChecked())) await cbRestore.check()
      await page.getByRole('button', { name: '저장하기' }).click()
      await page.waitForURL('**/settings', { timeout: 8000 })
      check('username 원복 저장', page.url().includes('/settings'))

      // ── Step 7: project 수정 후 공개 페이지 반영 ──
      console.log('\n[7] 프로젝트 수정 → 공개 페이지 반영')
      // /projects 에서 첫 번째 프로젝트 클릭 → 수정 페이지로 이동 (프로젝트 없으면 skip)
      await page.goto(`${BASE}/projects`)
      await page.waitForLoadState('networkidle')
      const projectLinks = page.locator('a[href^="/projects/"]').filter({ hasNot: page.locator('[href$="/new"]') })
      const projectCount = await projectLinks.count()
      if (projectCount > 0) {
        await projectLinks.first().click()
        await page.waitForURL('**/projects/**', { timeout: 5000 })
        const editLink = page.getByRole('link', { name: '수정' })
        if (await editLink.count() > 0) {
          await editLink.click()
          await page.waitForURL('**/edit', { timeout: 5000 })
          // description에 타임스탬프 추가
          const ts = Date.now().toString().slice(-6)
          const descInput = page.locator('textarea[name="description"]')
          const currentDesc = await descInput.inputValue()
          await descInput.fill(`${currentDesc.slice(0, 50)} [e2e-${ts}]`)
          await page.getByRole('button', { name: '수정 완료' }).click()
          await page.waitForURL(url => !url.toString().includes('/edit'), { timeout: 10000 })

          // 공개 페이지에서 변경 반영 확인
          const publicCtx4 = await browser.newContext()
          const publicPage4 = await publicCtx4.newPage()
          await publicPage4.goto(`${BASE}/u/${testUsername}`)
          await publicPage4.waitForLoadState('networkidle')
          const updatedBody = await publicPage4.textContent('body')
          check(`프로젝트 수정 공개 페이지 반영 [e2e-${ts}]`, updatedBody?.includes(`e2e-${ts}`) ?? false)
          await publicCtx4.close()
        } else {
          console.log('  ⏭ 수정 링크 없음 — skip')
        }
      } else {
        console.log('  ⏭ 프로젝트 없음 — skip')
      }

    } catch (err) {
      console.error('\n💥', err.message.split('\n')[0], '—', page.url())
      failed++
    } finally {
      await browser.close()
      console.log(`\n${'─'.repeat(40)}`)
      console.log(`결과: ${passed}개 통과, ${failed}개 실패`)
      process.exit(failed > 0 ? 1 : 0)
    }
  }

  run()
  ```

- [ ] **Step 2: Start dev server and run E2E**

  터미널 1 (dev server):
  ```bash
  npm run dev
  ```

  터미널 2 (E2E — Windows side if using WSL2):
  ```bash
  node e2e_public_portfolio.mjs
  ```

  Expected:
  ```
  [1] 로그인
    ✅ 로그인 → /logs
  [2] 설정 페이지
    ✅ /settings 접근
    ✅ 설정 heading 표시
    ✅ username 입력 필드 존재
  [3] 공개 OFF → 404
    ✅ 공개 OFF → 404 표시
  [4] 공개 ON → 포트폴리오 접근 가능
    ✅ 공개 ON → 200 접근
    ✅ 포트폴리오 이름 표시
  [5] username 변경
    ✅ 기존 URL 404
    ✅ 새 URL 200
  ...
  결과: N개 통과, 0개 실패
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add e2e_public_portfolio.mjs
  git commit -m "test: add E2E for public portfolio page (public toggle, username change, revalidation)"
  ```

---

## Self-Review Checklist (완료)

**Spec coverage:**
- [x] Section 1: profiles table + trigger + backfill + RLS → Task 1, 2, 3
- [x] Section 2: App Router 구조, params await, proxy.ts, ISR, generateMetadata → Task 10, 13
- [x] Section 3: PortfolioData types, buildPortfolioData, generateMarkdown 시그니처, revalidatePortfolio → Task 4, 8, 9, 16
- [x] Section 4: ensureProfile, signup, login self-healing, settings updateProfile, revalidatePath 전략 → Task 7, 11, 14, 15, 18
- [x] Section 5: Phase 1→5 구현 순서 반영 → Task 순서 일치
- [x] E2E: 공개 OFF 404, 공개 ON 200, username 변경 URL 교체, project 수정 반영 → Task 19

**Type consistency:**
- `PortfolioData` / `PortfolioProfile`: Task 4 정의 → Task 8, 16, 17 사용 ✓
- `buildPortfolioData(supabase, userId)`: Task 8 정의 → Task 10, 17 호출 ✓
- `revalidatePortfolio(userId, supabase)`: Task 9 정의 → Task 18 호출 ✓
- `ensureProfile(userId, email, supabase)`: Task 7 정의 → Task 14, 15 호출 ✓
- `updateProfile` Server Action: Task 11 정의 → Task 12 (`SettingsForm`) import ✓
- `SettingsState = { error: string } | null`: Task 11 정의 → Task 12 import ✓
- `generateMarkdown(data: PortfolioData)`: Task 16 변경 → Task 17 호출 ✓
