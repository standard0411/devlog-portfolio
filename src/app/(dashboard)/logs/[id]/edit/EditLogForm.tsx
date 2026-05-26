'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { updateLog } from '../../actions'
import type { UpdateLogState } from '../../actions'
import type { Log } from '@/types'

export default function EditLogForm({ log }: { log: Log }) {
  const boundUpdateLog = updateLog.bind(null, log.id)
  const [state, formAction, isPending] = useActionState<UpdateLogState, FormData>(boundUpdateLog, null)

  return (
    <div className="max-w-2xl">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/logs/${log.id}`}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <h1 className="text-xl font-semibold text-white">기록 수정</h1>
      </div>

      {/* 폼 카드 */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <form action={formAction} className="space-y-5">

          {/* 제목 */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-zinc-300 mb-1.5">
              제목 <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              defaultValue={log.title}
              className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>

          {/* 카테고리 + 날짜 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-zinc-300 mb-1.5">
                카테고리 <span className="text-red-500">*</span>
              </label>
              <select
                id="category"
                name="category"
                required
                defaultValue={log.category}
                className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              >
                <option value="cs">CS 지식</option>
                <option value="trend">개발 트렌드</option>
                <option value="etc">기타</option>
              </select>
            </div>

            <div>
              <label htmlFor="learned_at" className="block text-sm font-medium text-zinc-300 mb-1.5">
                학습 날짜 <span className="text-red-500">*</span>
              </label>
              <input
                id="learned_at"
                name="learned_at"
                type="date"
                required
                defaultValue={log.learned_at}
                className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* 내용 */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-zinc-300 mb-1.5">
              내용 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="content"
              name="content"
              required
              rows={7}
              defaultValue={log.content}
              className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-none"
            />
          </div>

          {/* 태그 */}
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-zinc-300 mb-1.5">
              태그
              <span className="text-zinc-500 font-normal ml-1">(쉼표로 구분, 선택)</span>
            </label>
            <input
              id="tags"
              name="tags"
              type="text"
              defaultValue={log.tags.join(', ')}
              className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>

          {/* 에러 메시지 */}
          {state?.error && (
            <div className="flex items-start gap-2.5 text-sm text-red-400 bg-red-950/50 border border-red-900/60 rounded-lg px-3.5 py-2.5">
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {state.error}
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="flex gap-3 pt-1">
            <Link
              href={`/logs/${log.id}`}
              className="flex-1 py-2.5 border border-zinc-700 hover:border-zinc-600 text-zinc-400 hover:text-white font-medium rounded-lg text-sm transition-colors text-center"
            >
              취소
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:opacity-70 disabled:cursor-not-allowed text-white font-medium rounded-lg text-sm transition-colors"
            >
              {isPending ? '저장 중...' : '수정 완료'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
