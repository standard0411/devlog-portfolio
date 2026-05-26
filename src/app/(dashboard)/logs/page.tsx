import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Log, LogCategory } from '@/types'

const CATEGORY_LABEL: Record<LogCategory, string> = {
  cs: 'CS',
  trend: '트렌드',
  etc: '기타',
}

const CATEGORY_STYLE: Record<LogCategory, string> = {
  cs: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/25',
  trend: 'bg-purple-500/15 text-purple-400 border border-purple-500/25',
  etc: 'bg-zinc-700/60 text-zinc-400 border border-zinc-600/50',
}

export default async function LogsPage() {
  let logs: Log[] = []
  let fetchError: string | null = null

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('logs')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      fetchError = '데이터를 불러오는 중 오류가 발생했습니다.'
    } else {
      logs = (data ?? []) as Log[]
    }
  } catch (e) {
    fetchError = e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다.'
  }

  if (fetchError) {
    return (
      <div className="text-center py-20 px-4">
        <p className="text-red-400 text-sm max-w-sm mx-auto">{fetchError}</p>
      </div>
    )
  }

  return (
    <div>
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">공부 기록</h1>
          {logs.length > 0 && (
            <p className="text-sm text-zinc-500 mt-0.5">총 {logs.length}개</p>
          )}
        </div>
        <Link
          href="/logs/new"
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          새 기록
        </Link>
      </div>

      {/* 빈 상태 */}
      {logs.length === 0 && <EmptyState />}

      {/* 기록 목록 */}
      {logs.length > 0 && (
        <div className="space-y-3">
          {logs.map((log) => (
            <LogCard key={log.id} log={log} />
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-24 px-4">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 mb-5">
        <svg
          className="w-8 h-8 text-zinc-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
      </div>
      <h3 className="text-zinc-300 font-medium mb-1.5">아직 기록이 없어요</h3>
      <p className="text-zinc-600 text-sm mb-6">첫 번째 공부 기록을 남겨보세요</p>
      <Link
        href="/logs/new"
        className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        첫 기록 추가하기
      </Link>
    </div>
  )
}

function LogCard({ log }: { log: Log }) {
  // 'YYYY-MM-DD' 문자열은 UTC 자정으로 파싱됨.
  // T12:00:00 을 붙여 정오 기준으로 맞추면 어떤 타임존 서버에서도 날짜가 밀리지 않음.
  const formattedDate = new Date(log.learned_at + 'T12:00:00').toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <Link href={`/logs/${log.id}`} className="block">
      <article className="group bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 transition-colors">
        {/* 배지 + 날짜 */}
        <div className="flex items-center gap-2 mb-2.5 flex-wrap">
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_STYLE[log.category]}`}
          >
            {CATEGORY_LABEL[log.category]}
          </span>
          <span className="text-xs text-zinc-500">{formattedDate}</span>
        </div>

        {/* 제목 */}
        <h2 className="text-white font-medium mb-2 group-hover:text-indigo-300 transition-colors">
          {log.title}
        </h2>

        {/* 내용 미리보기 */}
        <p className="text-zinc-400 text-sm leading-relaxed line-clamp-2">{log.content}</p>

        {/* 태그 */}
        {log.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {log.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-md"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </article>
    </Link>
  )
}
