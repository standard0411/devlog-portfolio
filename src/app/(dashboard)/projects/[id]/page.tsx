import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Project } from '@/types'
import { deleteProject } from '../actions'
import DeleteButton from './DeleteButton'

function formatMonth(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
  })
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  const project = data as Project | null
  if (!project) notFound()

  const isOngoing = project.ended_at === null
  const boundDeleteProject = deleteProject.bind(null, project.id)

  return (
    <div className="max-w-2xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/projects"
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          목록으로
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/projects/${project.id}/edit`}
            className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-600 rounded-lg transition-colors"
          >
            수정
          </Link>
          <DeleteButton deleteAction={boundDeleteProject} />
        </div>
      </div>

      {/* 본문 카드 */}
      <article className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        {/* 이름 + 상태 배지 */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h1 className="text-xl font-semibold text-white">{project.name}</h1>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${
              isOngoing
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                : 'bg-zinc-700/60 text-zinc-400 border border-zinc-600/50'
            }`}
          >
            {isOngoing ? '진행 중' : '완료'}
          </span>
        </div>

        {/* 역할 */}
        {project.role && (
          <p className="text-sm text-zinc-500 mb-3">{project.role}</p>
        )}

        {/* 기간 */}
        <p className="text-xs text-zinc-600 mb-5">
          {formatMonth(project.started_at)}
          {' ~ '}
          {isOngoing ? '진행 중' : formatMonth(project.ended_at!)}
        </p>

        {/* 설명 */}
        <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
          {project.description}
        </p>

        {/* 기술 스택 */}
        {project.tech_stack.length > 0 && (
          <div className="mt-6 pt-6 border-t border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2.5">기술 스택</p>
            <div className="flex flex-wrap gap-1.5">
              {project.tech_stack.map((tech) => (
                <span
                  key={tech}
                  className="text-xs px-2.5 py-1 bg-zinc-800 text-zinc-300 rounded-md border border-zinc-700"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 링크 */}
        {(project.github_url || project.demo_url) && (
          <div className="flex gap-3 mt-6 pt-6 border-t border-zinc-800">
            {project.github_url && (
              <a
                href={project.github_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                </svg>
                GitHub
              </a>
            )}
            {project.demo_url && (
              <a
                href={project.demo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                데모
              </a>
            )}
          </div>
        )}
      </article>
    </div>
  )
}
