# Public Portfolio Page — Design Spec

**Date:** 2026-05-27  
**Status:** Approved  
**Goal:** "기록 도구 → 공유 가능한 포트폴리오 서비스" — 인증 없이 접근 가능한 공개 포트폴리오 URL 제공

---

## Section 1 — 데이터 모델

### profiles 테이블

```sql
create table profiles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  display_name text,
  bio         text,
  github_url  text,
  website_url text,
  is_public   boolean not null default false,
  updated_at  timestamptz not null default now()
);
```

- PK는 `id` 아닌 `user_id` — `auth.users.id`를 직접 FK로 사용
- `updated_at`은 DB trigger로 자동 갱신 (애플리케이션 코드에서 직접 set 금지)
- `username`: 소문자 영문+숫자+하이픈, 3–30자, 예약어 제외
- `is_public`: 프로필 단위 전체 공개/비공개 (MVP 범위)

### updated_at 트리거

```sql
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_updated_at
before update on profiles
for each row execute procedure set_updated_at();
```

### username 생성 규칙

- 이메일 로컬 파트에서 slug 생성 (`@` 앞부분, 특수문자 → 하이픈)
- 충돌 시 숫자 suffix 순차 증가: `hong`, `hong2`, `hong3`, …
- 예약어: `admin`, `api`, `login`, `signup`, `logout`, `settings`, `u`, `health`, `portfolio`, `logs`, `projects`, `skills`

### 기존 유저 backfill

- Migration 시 `auth.users` 전체 대상 username 일괄 생성
- 충돌 해결 후 `profiles` INSERT (is_public = false 기본값)

### RLS 정책

```sql
-- profiles: 본인 full access
create policy "profiles_owner" on profiles
  for all using (auth.uid() = user_id);

-- profiles: is_public=true 행 public read (인증 여부 무관)
create policy "profiles_public_read" on profiles
  for select using (is_public = true);

-- projects/skills/logs: 소유자 full access + is_public owner의 행 public read
create policy "projects_public_read" on projects
  for select using (
    auth.uid() = user_id or
    exists (select 1 from profiles where profiles.user_id = projects.user_id and profiles.is_public = true)
  );
-- skills, logs 동일 패턴 적용
```

**검증:** RLS 작성 후 Supabase SQL Editor에서 anon role로 조회 테스트 수행

---

## Section 2 — App Router 구조

### 라우트

```
src/app/
  (public)/
    u/
      [username]/
        page.tsx          # 공개 포트폴리오 (ISR, revalidate=3600)
        not-found.tsx
        PortfolioView.tsx # CV-style 컴포넌트
  (dashboard)/
    settings/
      page.tsx
      SettingsForm.tsx
      actions.ts
    portfolio/
      page.tsx            # 기존 (수정)
    logs/
    projects/
    skills/
  (auth)/
    login/
    signup/
```

### Next.js 16 params 처리

App Router에서 dynamic segment params는 `Promise`로 전달됨:

```ts
// src/app/(public)/u/[username]/page.tsx
export default async function Page({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  // ...
}
```

### proxy.ts 수정

`/u/` 경로를 인증 리다이렉트 제외 목록에 추가:

```ts
// 기존 조건에 추가
if (
  pathname.startsWith('/login') ||
  pathname.startsWith('/signup') ||
  pathname.startsWith('/api/') ||
  pathname.startsWith('/u/')    // 추가
) {
  return NextResponse.next()
}
```

### ISR 설정

```ts
// (public)/u/[username]/page.tsx
export const revalidate = 3600  // 1시간 기본 캐시
```

On-demand revalidation: dashboard Server Action에서 콘텐츠 변경 시 `revalidatePath('/u/[username]', 'page')` 호출

### SEO / generateMetadata

```ts
export async function generateMetadata({ params }) {
  const { username } = await params
  const profile = await fetchPublicProfile(username)
  if (!profile) return { title: '포트폴리오를 찾을 수 없습니다' }
  return {
    title: `${profile.display_name ?? username}의 포트폴리오`,
    description: profile.bio ?? `${username}의 개발 포트폴리오`,
    openGraph: { ... }
  }
}
```

---

## Section 3 — 데이터 레이어 추상화

### 타입 정의

```ts
// src/lib/portfolio/types.ts
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

- `PortfolioProfile`은 DB Row 타입 그대로 (ViewModel 변환은 컴포넌트 책임)
- `null → Result` 타입 전환은 미래 옵션으로 보류

### buildPortfolioData

```ts
// src/lib/portfolio/buildPortfolioData.ts
export async function buildPortfolioData(
  supabase: SupabaseClient,
  userId: string
): Promise<PortfolioData | null>
```

- profile, projects, skills, logs 병렬 조회 (`Promise.all`)
- profile이 없으면 `null` 반환 (호출자가 `notFound()` 처리)
- 에러 시 throw (catch 하지 않음 — Next.js error boundary가 처리)

### generateMarkdown 시그니처 변경

```ts
// 기존
generateMarkdown({ projects, skills, logs, userEmail })

// 변경
generateMarkdown(data: PortfolioData): string
```

내부에서 `data.profile.username` 또는 `data.profile.display_name` 사용

### revalidatePortfolio

```ts
// src/lib/portfolio/revalidatePortfolio.ts
export async function revalidatePortfolio(
  userId: string,
  supabase: SupabaseClient
): Promise<void>
```

- `profiles`에서 해당 userId의 username 조회
- `is_public = true`인 경우에만 `revalidatePath('/u/[username]', 'page')` 호출
- username 없거나 is_public=false면 no-op

---

## Section 4 — Auth Flow & Profile Lifecycle

### ensureProfile

```ts
// src/lib/profile.ts
export async function ensureProfile(
  userId: string,
  email: string,
  supabase: SupabaseClient
): Promise<void>
```

**동작:**
1. `profiles`에서 userId로 조회
2. 존재하면 return (no-op)
3. 없으면 `generateUniqueUsername(email, supabase)` 호출
4. `INSERT INTO profiles (user_id, username)` — `on conflict do nothing`
5. INSERT 후 재조회하여 row 없으면 non-unique conflict → **throw** (silent return 금지)

**에러 처리:**
- UNIQUE 제약 위반 외 DB 에러: throw
- non-unique conflict 감지: throw (INSERT + re-SELECT로 판단)
- 호출자(signup/login)가 catch → 사용자에게 에러 표시

### signup flow

```ts
// signup/actions.ts — signUp 성공 후
if (!error) {
  await ensureProfile(data.user.id, email, supabase)
}
```

### login flow (기존 유저 self-healing)

```ts
// login/actions.ts — 로그인 성공 후
// 기존 유저 중 profiles 행이 없는 경우 복구 목적
await ensureProfile(user.id, user.email, supabase)
```

### Settings page

- `display_name`, `bio`, `github_url`, `website_url`, `is_public`, `username` 수정
- `updateProfile` Server Action:
  - 빈 문자열 URL → `null` 정규화 (DB에 빈 string 저장 금지)
  - `updated_at`은 DB trigger가 처리 (직접 set 금지)
  - username 변경 시 기존 `/u/[old-username]` revalidate + 새 `/u/[new-username]` revalidate 모두 수행

### revalidatePath 전략

| 변경 위치 | revalidatePath 필수 여부 |
|-----------|-------------------------|
| projects create/update/delete | 필수 |
| skills create/update/delete | 필수 |
| settings updateProfile | 필수 |
| logs create/update/delete | MVP 생략 가능 |

---

## Section 5 — Implementation Order

### Phase 1 — DB

1. `profiles` 테이블 migration (컬럼, PK, FK, default값)
2. `updated_at` 자동 갱신 trigger
3. 기존 유저 username backfill SQL
4. RLS 정책 (profiles own + public read; projects/skills/logs public read)
5. **검증:** Supabase SQL Editor에서 anon role로 `is_public=true` 조회 테스트

### Phase 2 — TypeScript 인프라 (새 파일, 기존 코드 무변경)

6. `src/lib/portfolio/types.ts`
7. `src/lib/supabase/public.ts` — `createPublicClient()` (anon key, 쿠키 없음)
8. `src/lib/username.ts` — `deriveBase()`, `generateUniqueUsername()`, `RESERVED`
9. `src/lib/profile.ts` — `ensureProfile()`
10. `src/lib/portfolio/buildPortfolioData.ts`
11. `src/lib/portfolio/revalidatePortfolio.ts`

### Phase 3 — 신규 라우트 (기존 라우트 무관)

12. `src/app/(public)/u/[username]/page.tsx` + `not-found.tsx` + `PortfolioView.tsx`
13. `src/app/(dashboard)/settings/page.tsx` + `SettingsForm.tsx` + `actions.ts`

### Phase 4 — 기존 코드 수정 (의존 코드가 모두 준비된 후)

14. `proxy.ts` — `/u/` 경로 auth 제외 추가
15. `signup/actions.ts` — `ensureProfile()` 호출 삽입
16. `login/actions.ts` — self-healing `ensureProfile()` 호출 (기존 유저 profiles 행 복구 목적)
17. `portfolio/generateMarkdown.ts` — `PortfolioData` 타입으로 시그니처 변경
18. `portfolio/page.tsx` — `buildPortfolioData()` 교체, `revalidatePortfolio` 연결
19. `projects` / `skills` Server Actions — `revalidatePortfolio()` 추가 (logs는 MVP 생략)
20. `settings/actions.ts` — `revalidatePortfolio()` 추가

### Phase 5 — E2E 검증

21. E2E 시나리오:
    - 비로그인 `/u/[username]` 접근 → 200 (공개 ON인 경우)
    - `is_public = false` 상태에서 `/u/[username]` → 404
    - `is_public = true` 상태에서 `/u/[username]` → 200, 컨텐츠 확인
    - username 변경 후 기존 URL → 404, 새 URL → 200
    - project/skill 수정 후 공개 페이지 반영 확인

---

## 제약 및 결정 사항

| 항목 | 결정 |
|------|------|
| URL 구조 | `/u/[username]` |
| username 생성 | 회원가입 시 자동 생성 (ensureProfile) |
| 공개 범위 | 프로필 단위 전체 공개/비공개 |
| 포트폴리오 스타일 | CV-style (채용담당자/외부인 대상) |
| username 생성 방식 | Application-level (ensureProfile) |
| updated_at 관리 | DB trigger (앱 코드 직접 set 금지) |
| 빈 URL 처리 | 빈 문자열 → null 정규화 |
| ensureProfile non-unique | throw (silent return 금지) |
| logs revalidate | MVP 생략 가능 |
| ISR revalidate 주기 | 3600초 (기본) + on-demand |
