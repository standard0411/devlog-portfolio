# DevLog — 공부 기록 & 포트폴리오

CS 공부, 개발 트렌드, 프로젝트를 기록하고 Markdown 포트폴리오를 자동 생성하는 개인용 웹 애플리케이션입니다.

## 기술 스택

| 분류 | 사용 기술 |
|------|-----------|
| Frontend | Next.js 16.2.6 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Backend / DB | Supabase (PostgreSQL, Auth, RLS) |
| Auth | Supabase SSR (`@supabase/ssr`) — 쿠키 기반 세션 |
| 배포 | Vercel |

## 주요 기능

- **공부 기록 (Logs)** — 카테고리(CS / 트렌드 / 기타), 태그, 날짜 기반 기록 CRUD
- **프로젝트 기록 (Projects)** — 기간, 역할, 기술 스택, GitHub/데모 URL 포함 CRUD
- **기술 스택 관리 (Skills)** — 카테고리별 그룹, 숙련도 배지, 인라인 수정
- **포트폴리오 자동 생성** — 전체 데이터를 Markdown으로 변환, 클립보드 복사 및 `.md` 다운로드

## 아키텍처

### Server / Client Component 분리

데이터 패칭과 인증은 Server Component에서 처리하고, 상호작용이 필요한 부분만 Client Component로 분리했습니다.

```
Server Component (async)
  └── 데이터 fetch (Supabase)
  └── props로 직렬화 가능한 데이터 전달
        └── Client Component ('use client')
              └── useActionState — Server Action 폼
              └── 복사 / 다운로드 버튼
              └── 삭제 confirm 다이얼로그
```

### 인증 흐름

```
요청 → proxy.ts (Next.js 16)
  ├── 비로그인 + 보호 경로 → /login 리다이렉트
  ├── 로그인 + /login, /signup → /logs 리다이렉트
  └── Server Action 요청 (Next-Action 헤더) → 바이패스
        └── 각 Server Action 내부에서 getUser() 재검증
```

### 데이터 보안

- Supabase RLS: `auth.uid() = user_id` 로 본인 데이터만 접근 허용
- Server Action에서 `.eq('user_id', user.id)` 이중 검증
- URL 입력값 서버 사이드 형식 검증 (`^https?://`)
- category / level 허용값 서버 사이드 열거형 검증

### 뮤테이션 패턴

```
Server Action
  └── 입력값 검증
  └── getUser() → 미인증 시 에러 반환
  └── Supabase insert / update / delete
  └── revalidatePath() → redirect()
```

## E2E 테스트 결과

Playwright 기반 헤드리스 브라우저 테스트 (실제 Supabase 연결, 실제 브라우저 조작)

| 대상 | 파일 | 결과 |
|------|------|------|
| 인증 + Logs 흐름 | `e2e_final.mjs` | 9 / 9 통과 |
| Logs 전체 CRUD | `e2e_crud.mjs` | 13 / 13 통과 |
| Projects 전체 CRUD | `e2e_projects.mjs` | 18 / 18 통과 |
| Skills 전체 CRUD | `e2e_skills.mjs` | 12 / 12 통과 |
| Portfolio 생성 + 다운로드 | `e2e_portfolio.mjs` | 14 / 14 통과 |

## 로컬 실행

### 1. 클론 및 의존성 설치

```bash
git clone https://github.com/your-username/devlog-portfolio.git
cd devlog-portfolio
npm install
```

### 2. 환경변수 설정

`.env.local` 파일을 루트에 생성합니다.

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

두 값 모두 Supabase 대시보드 → Settings → API에서 확인할 수 있습니다.

### 3. Supabase 테이블 생성

Supabase 대시보드 → SQL Editor에서 순서대로 실행합니다.

**logs 테이블**

```sql
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

alter table public.logs enable row level security;

create policy "own logs" on public.logs
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index logs_user_id_idx    on public.logs(user_id);
create index logs_learned_at_idx on public.logs(learned_at desc);
```

**projects 테이블** — `supabase/projects.sql` 내용 실행

**skills 테이블** — `supabase/skills.sql` 내용 실행

### 4. 개발 서버 실행

```bash
npm run dev
# http://localhost:3000
```

## 환경변수

| 변수명 | 설명 | 필수 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (공개) 키 | ✅ |

> `NEXT_PUBLIC_` 접두사가 붙은 값은 클라이언트에 노출되어도 안전합니다. 실제 데이터 접근은 RLS 정책으로 제어됩니다.

## 배포 (Vercel)

### 1. Vercel 프로젝트 생성

Vercel 대시보드에서 GitHub 저장소를 연결합니다.

### 2. 환경변수 설정

Vercel → Settings → Environment Variables에서 추가합니다.

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 3. Supabase 인증 URL 설정

Supabase 대시보드 → Authentication → URL Configuration

```
Site URL:      https://your-app.vercel.app
Redirect URLs: https://your-app.vercel.app/**
```

> 이 설정을 하지 않으면 이메일 인증 후 리다이렉트가 localhost로 향합니다.

### 4. 배포

```bash
git push origin main  # Vercel이 자동으로 빌드 및 배포합니다
```

## 프로젝트 구조

```
src/
├── app/
│   ├── (auth)/               # 로그인, 회원가입
│   │   ├── login/
│   │   └── signup/
│   ├── (dashboard)/          # 인증 필요 영역 (공통 헤더 레이아웃)
│   │   ├── layout.tsx        # 헤더 + 인증 검사
│   │   ├── logs/             # 공부 기록 CRUD
│   │   ├── projects/         # 프로젝트 CRUD
│   │   ├── skills/           # 기술 스택 관리
│   │   └── portfolio/        # Markdown 자동 생성
│   └── layout.tsx            # 루트 레이아웃 (폰트, metadata)
├── lib/
│   └── supabase/             # Supabase 클라이언트 (server / client 분리)
├── types/
│   └── index.ts              # 공유 타입 정의 (Log, Project, Skill)
└── proxy.ts                  # Next.js 16 Proxy — 인증 라우팅

supabase/
├── projects.sql
└── skills.sql
```

## 빌드 확인

```bash
npx tsc --noEmit  # 타입 검사
npm run build     # 프로덕션 빌드
```
