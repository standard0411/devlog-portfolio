import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Project } from '@/types'

function formatMonth(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
  })
}

export default async function ProjectsPage() {
  let projects: Project[] = []
  let fetchError: string | null = null

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      fetchError = '데이터를 불러오는 중 오류가 발생했습니다.'
    } else {
      projects = (data ?? []) as Project[]
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
          <h1 className="text-xl font-semibold text-white">프로젝트</h1>
          {projects.length > 0 && (
            <p className="text-sm text-zinc-500 mt-0.5">총 {projects.length}개</p>
          )}
        </div>
        <Link
          href="/projects/new"
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          새 프로젝트
        </Link>
      </div>

      {projects.length === 0 && <EmptyState />}

      {projects.length > 0 && (
        <div className="space-y-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} formatMonth={formatMonth} />
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
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
      </div>
      <h3 className="text-zinc-300 font-medium mb-1.5">아직 프로젝트가 없어요</h3>
      <p className="text-zinc-600 text-sm mb-6">첫 번째 프로젝트를 기록해보세요</p>
      <Link
        href="/projects/new"
        className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        첫 프로젝트 추가하기
      </Link>
    </div>
  )
}

function ProjectCard({
  project,
  formatMonth,
}: {
  project: Project
  formatMonth: (d: string) => string
}) {
  const isOngoing = project.ended_at === null

  const dateRange = `${formatMonth(project.started_at)} ~ ${isOngoing ? '진행 중' : formatMonth(project.ended_at!)}`

  return (
    <Link href={`/projects/${project.id}`} className="block">
      <article className="group bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 transition-colors">
        {/* 상단: 이름 + 상태 배지 */}
        <div className="flex items-start justify-between gap-3 mb-1.5">
          <h2 className="text-white font-medium group-hover:text-indigo-300 transition-colors">
            {project.name}
          </h2>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
              isOngoing
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                : 'bg-zinc-700/60 text-zinc-400 border border-zinc-600/50'
            }`}
          >
            {isOngoing ? '진행 중' : '완료'}
          </span>
        </div>

        {/* 역할 + 날짜 */}
        <div className="flex items-center gap-2 mb-2.5 text-xs text-zinc-500 flex-wrap">
          {project.role && <span>{project.role}</span>}
          {project.role && <span>·</span>}
          <span>{dateRange}</span>
        </div>

        {/* 설명 미리보기 */}
        <p className="text-zinc-400 text-sm leading-relaxed line-clamp-2 mb-3">
          {project.description}
        </p>

        {/* 기술 스택 태그 */}
        {project.tech_stack.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {project.tech_stack.map((tech) => (
              <span
                key={tech}
                className="text-xs px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-md"
              >
                {tech}
              </span>
            ))}
          </div>
        )}
      </article>
    </Link>
  )
}
