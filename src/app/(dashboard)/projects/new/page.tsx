'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { addProject } from '../actions'
import type { ProjectState } from '../actions'

export default function NewProjectPage() {
  const [state, formAction, isPending] = useActionState<ProjectState, FormData>(addProject, null)

  return (
    <div className="max-w-2xl">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/projects"
          className="flex items-center justify-center w-8 h-8 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <h1 className="text-xl font-semibold text-white">새 프로젝트</h1>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <form action={formAction} className="space-y-5">

          {/* 프로젝트 이름 */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-1.5">
              프로젝트 이름 <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="프로젝트 이름을 입력하세요"
              className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>

          {/* 내 역할 */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-zinc-300 mb-1.5">
              내 역할
              <span className="text-zinc-500 font-normal ml-1">(선택)</span>
            </label>
            <input
              id="role"
              name="role"
              type="text"
              placeholder="예) 풀스택 개발, 프론트엔드 담당"
              className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>

          {/* 설명 */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-zinc-300 mb-1.5">
              설명 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              required
              rows={5}
              placeholder="프로젝트 개요, 주요 기능, 기여한 부분 등을 자유롭게 작성하세요"
              className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-none"
            />
          </div>

          {/* 기술 스택 */}
          <div>
            <label htmlFor="tech_stack" className="block text-sm font-medium text-zinc-300 mb-1.5">
              기술 스택 <span className="text-red-500">*</span>
              <span className="text-zinc-500 font-normal ml-1">(쉼표로 구분)</span>
            </label>
            <input
              id="tech_stack"
              name="tech_stack"
              type="text"
              required
              placeholder="React, TypeScript, Supabase, Tailwind CSS"
              className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>

          {/* GitHub URL + 데모 URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="github_url" className="block text-sm font-medium text-zinc-300 mb-1.5">
                GitHub URL
                <span className="text-zinc-500 font-normal ml-1">(선택)</span>
              </label>
              <input
                id="github_url"
                name="github_url"
                type="text"
                placeholder="https://github.com/..."
                className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="demo_url" className="block text-sm font-medium text-zinc-300 mb-1.5">
                데모 URL
                <span className="text-zinc-500 font-normal ml-1">(선택)</span>
              </label>
              <input
                id="demo_url"
                name="demo_url"
                type="text"
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* 시작일 + 종료일 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="started_at" className="block text-sm font-medium text-zinc-300 mb-1.5">
                시작일 <span className="text-red-500">*</span>
              </label>
              <input
                id="started_at"
                name="started_at"
                type="date"
                required
                className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="ended_at" className="block text-sm font-medium text-zinc-300 mb-1.5">
                종료일
                <span className="text-zinc-500 font-normal ml-1">(비우면 진행 중)</span>
              </label>
              <input
                id="ended_at"
                name="ended_at"
                type="date"
                className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
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
              href="/projects"
              className="flex-1 py-2.5 border border-zinc-700 hover:border-zinc-600 text-zinc-400 hover:text-white font-medium rounded-lg text-sm transition-colors text-center"
            >
              취소
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:opacity-70 disabled:cursor-not-allowed text-white font-medium rounded-lg text-sm transition-colors"
            >
              {isPending ? '저장 중...' : '저장하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
