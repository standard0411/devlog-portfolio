import Link from 'next/link'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { logout } from './actions'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Server Action 요청은 각 액션이 직접 인증을 검사하므로 레이아웃 체크 건너뜀
  const headersList = await headers()
  const isServerAction = headersList.get('Next-Action') !== null

  // 환경변수 미설정 시 인증 건너뜀 (로컬 개발 안전장치)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  if (!isServerAction && supabaseUrl.startsWith('https://')) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* 브랜드 */}
          <Link
            href="/logs"
            className="flex items-center gap-2 shrink-0 text-white font-bold"
          >
            <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253" />
              </svg>
            </div>
            <span className="text-sm">DevLog</span>
          </Link>

          {/* 내비게이션 */}
          <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            <NavLink href="/logs">공부 기록</NavLink>
            <NavLink href="/projects">프로젝트</NavLink>
            <NavLink href="/skills">기술 스택</NavLink>
            <NavLink href="/portfolio">포트폴리오</NavLink>
            <NavLink href="/settings">설정</NavLink>
          </nav>

          {/* 로그아웃 */}
          <form action={logout} className="shrink-0">
            <button
              type="submit"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 rounded"
            >
              로그아웃
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="shrink-0 px-3 py-1.5 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
    >
      {children}
    </Link>
  )
}
