@AGENTS.md

# DevLog Portfolio

CS 공부 기록, 프로젝트, 기술 스택을 관리하고 포트폴리오를 자동 생성하는 개인용 앱.

## Stack

- **Next.js 16.2.6** App Router — training data와 다른 breaking changes 있음. 코드 작성 전 `node_modules/next/dist/docs/` 확인
- **React 19**
- **Tailwind CSS v4** — v3과 설정 방식 다름. `@tailwindcss/postcss` 플러그인 방식 사용
- **Supabase** (`@supabase/ssr`) — 서버/클라이언트 클라이언트 분리 필수
- **TypeScript** strict

## Directory Structure

```
src/
  app/
    (auth)/         # 비인증 페이지: login, signup
    (dashboard)/    # 인증 필요 페이지: logs, projects, skills, portfolio
      actions.ts    # 모든 Server Actions
    api/            # Route Handlers
  components/
    ui/             # 순수 UI 컴포넌트 (로직 없음)
  lib/
    supabase/
      client.ts     # 브라우저(클라이언트 컴포넌트)용
      server.ts     # 서버(Server Component, Route Handler)용
  types/            # 공유 타입 정의 (Log, Project, Skill 등)
  proxy.ts          # 인증 미들웨어 (middleware.ts 역할)
```

## Supabase Client 규칙

**서버 컴포넌트 / Route Handler:**
```ts
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()
```

**클라이언트 컴포넌트 (`'use client'`):**
```ts
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
```

절대로 서버/클라이언트 클라이언트를 바꿔 쓰지 않는다.

## Auth Flow

- `src/proxy.ts`가 미들웨어 역할 — 비로그인 상태에서 `/login`/`/signup`/`/api/*` 외 모든 경로를 `/login`으로 리다이렉트
- `/api/*` 경로는 인증 리다이렉트 **제외** (Route Handler가 직접 인증 처리)
- Next-Action 헤더가 있는 Server Action 요청도 미들웨어 인증 체크 **건너뜀**

## Types

`src/types/` 에 정의된 타입만 사용. 새 도메인 타입은 이 파일에 추가.

- `Log`, `LogInsert`, `LogUpdate`
- `Project`, `ProjectInsert`, `ProjectUpdate`
- `Skill`, `SkillInsert`

## Commands

```bash
npm run dev    # 개발 서버
npm run build  # 프로덕션 빌드
npm run lint   # ESLint

# E2E 테스트 (Playwright)
node e2e_portfolio.mjs
node e2e_projects.mjs
node e2e_skills.mjs
node e2e_crud.mjs
```
