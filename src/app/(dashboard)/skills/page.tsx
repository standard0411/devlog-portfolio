import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Skill, SkillCategory, SkillLevel } from '@/types'
import { deleteSkill } from './actions'
import { AddSkillForm, EditSkillForm } from './SkillForms'
import DeleteSkillButton from './DeleteSkillButton'

const CATEGORY_LABELS: Record<SkillCategory, string> = {
  frontend: '프론트엔드',
  backend: '백엔드',
  db: '데이터베이스',
  devops: 'DevOps',
  etc: '기타',
}

const LEVEL_LABELS: Record<SkillLevel, string> = {
  learning: '학습 중',
  familiar: '익숙',
  proficient: '능숙',
}

const LEVEL_COLORS: Record<SkillLevel, string> = {
  learning: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  familiar: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  proficient: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
}

const CATEGORY_ORDER: SkillCategory[] = ['frontend', 'backend', 'db', 'devops', 'etc']

export default async function SkillsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>
}) {
  const { edit: editingId } = await searchParams

  let skills: Skill[] = []
  let fetchError: string | null = null

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      fetchError = '데이터를 불러오는 중 오류가 발생했습니다.'
    } else {
      skills = (data ?? []) as Skill[]
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

  const grouped = CATEGORY_ORDER.reduce<Record<SkillCategory, Skill[]>>(
    (acc, cat) => {
      acc[cat] = skills.filter((s) => s.category === cat)
      return acc
    },
    { frontend: [], backend: [], db: [], devops: [], etc: [] },
  )

  const hasSkills = skills.length > 0
  const visibleCategories = CATEGORY_ORDER.filter((cat) => grouped[cat].length > 0)

  return (
    <div>
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">기술 스택</h1>
          {hasSkills && (
            <p className="text-sm text-zinc-500 mt-0.5">총 {skills.length}개</p>
          )}
        </div>
      </div>

      {/* 추가 폼 */}
      <AddSkillForm />

      {/* 빈 상태 */}
      {!hasSkills && (
        <div className="text-center py-16 px-4">
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
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="text-zinc-300 font-medium mb-1.5">아직 기술이 없어요</h3>
          <p className="text-zinc-600 text-sm">위 폼으로 첫 번째 기술을 추가해보세요</p>
        </div>
      )}

      {/* 카테고리별 목록 */}
      {hasSkills && (
        <div className="space-y-6">
          {visibleCategories.map((cat) => (
            <section key={cat}>
              <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-3">
                {CATEGORY_LABELS[cat]}
              </h2>
              <div className="space-y-2">
                {grouped[cat].map((skill) => {
                  const isEditing = editingId === skill.id
                  const boundDelete = deleteSkill.bind(null, skill.id)

                  return (
                    <div
                      key={skill.id}
                      className="bg-zinc-900 border border-zinc-800 rounded-xl p-3.5"
                    >
                      {isEditing ? (
                        <EditSkillForm skill={skill} />
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-sm text-white font-medium truncate">
                              {skill.name}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium border shrink-0 ${LEVEL_COLORS[skill.level]}`}
                            >
                              {LEVEL_LABELS[skill.level]}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Link
                              href={`/skills?edit=${skill.id}`}
                              className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
                              aria-label="수정"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </Link>
                            <DeleteSkillButton deleteAction={boundDelete} />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
