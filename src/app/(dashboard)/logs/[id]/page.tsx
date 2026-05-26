import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Log, LogCategory } from '@/types'
import { deleteLog } from '../actions'
import DeleteButton from './DeleteButton'

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

export default async function LogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data } = await supabase
    .from('logs')
    .select('*')
    .eq('id', id)
    .single()

  const log = data as Log | null
  if (!log) notFound()

  const formattedDate = new Date(log.learned_at + 'T12:00:00').toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const boundDeleteLog = deleteLog.bind(null, log.id)

  return (
    <div className="max-w-2xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/logs"
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          목록으로
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/logs/${log.id}/edit`}
            className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-600 rounded-lg transition-colors"
          >
            수정
          </Link>
          <DeleteButton deleteAction={boundDeleteLog} />
        </div>
      </div>

      {/* 본문 카드 */}
      <article className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        {/* 카테고리 + 날짜 */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_STYLE[log.category]}`}>
            {CATEGORY_LABEL[log.category]}
          </span>
          <span className="text-xs text-zinc-500">{formattedDate}</span>
        </div>

        {/* 제목 */}
        <h1 className="text-xl font-semibold text-white mb-4">{log.title}</h1>

        {/* 내용 */}
        <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{log.content}</p>

        {/* 태그 */}
        {log.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-6 pt-6 border-t border-zinc-800">
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
    </div>
  )
}
