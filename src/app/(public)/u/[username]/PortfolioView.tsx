import type { PortfolioData } from '@/lib/portfolio/types'
import type { SkillCategory } from '@/types'
import LogCard from '@/components/ui/LogCard'

const SKILL_CATEGORY_LABELS: Record<SkillCategory, string> = {
  frontend: '프론트엔드',
  backend: '백엔드',
  db: '데이터베이스',
  devops: 'DevOps',
  etc: '기타',
}

const SKILL_CATEGORY_ORDER: SkillCategory[] = ['frontend', 'backend', 'db', 'devops', 'etc']

export default function PortfolioView({ data }: { data: PortfolioData }) {
  const { profile, projects, skills, logs } = data

  const groupedSkills = SKILL_CATEGORY_ORDER.reduce<Record<SkillCategory, typeof skills>>(
    (acc, cat) => { acc[cat] = skills.filter((s) => s.category === cat); return acc },
    { frontend: [], backend: [], db: [], devops: [], etc: [] },
  )

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-3xl mx-auto py-12 px-6">

        {/* Header */}
        <header className="mb-12">
          <h1 className="text-3xl font-bold mb-2">
            {profile.display_name ?? profile.username}
          </h1>
          {profile.bio && (
            <p className="text-zinc-400 text-sm leading-relaxed mb-4">{profile.bio}</p>
          )}
          <div className="flex gap-4 text-sm">
            {profile.github_url && (
              <a
                href={profile.github_url}
                className="text-zinc-400 hover:text-white transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub ↗
              </a>
            )}
            {profile.website_url && (
              <a
                href={profile.website_url}
                className="text-zinc-400 hover:text-white transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                Website ↗
              </a>
            )}
          </div>
        </header>

        {/* Projects */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold mb-5 pb-2 border-b border-zinc-800">
            프로젝트 ({projects.length})
          </h2>
          {projects.length === 0 ? (
            <p className="text-zinc-500 text-sm">등록된 프로젝트가 없습니다.</p>
          ) : (
            <div className="space-y-8">
              {projects.map((p) => (
                <article key={p.id}>
                  <div className="flex items-start justify-between gap-4 mb-1">
                    <h3 className="font-semibold">{p.name}</h3>
                    <span className="text-xs text-zinc-500 shrink-0 mt-0.5">
                      {p.started_at} – {p.ended_at ?? '진행 중'}
                    </span>
                  </div>
                  {p.role && (
                    <p className="text-xs text-zinc-500 mb-2">{p.role}</p>
                  )}
                  <p className="text-sm text-zinc-300 leading-relaxed mb-3">
                    {p.description}
                  </p>
                  {p.tech_stack.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {p.tech_stack.map((t) => (
                        <span
                          key={t}
                          className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-3 text-xs text-zinc-500">
                    {p.github_url && (
                      <a
                        href={p.github_url}
                        className="hover:text-white transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        GitHub ↗
                      </a>
                    )}
                    {p.demo_url && (
                      <a
                        href={p.demo_url}
                        className="hover:text-white transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Demo ↗
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Skills */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold mb-5 pb-2 border-b border-zinc-800">
            기술 스택
          </h2>
          {skills.length === 0 ? (
            <p className="text-zinc-500 text-sm">등록된 기술이 없습니다.</p>
          ) : (
            <div className="space-y-4">
              {SKILL_CATEGORY_ORDER.filter((cat) => groupedSkills[cat].length > 0).map((cat) => (
                <div key={cat}>
                  <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
                    {SKILL_CATEGORY_LABELS[cat]}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {groupedSkills[cat].map((s) => (
                      <span
                        key={s.id}
                        className="text-sm bg-zinc-800 text-zinc-200 px-3 py-1 rounded-full"
                      >
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Logs */}
        {logs.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-5 pb-2 border-b border-zinc-800">
              최근 학습 기록 ({logs.length})
            </h2>
            <div className="space-y-8">
              {logs.map((log) => (
                <LogCard key={log.id} log={log} />
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  )
}
