import type { Project, Skill, Log, SkillCategory, SkillLevel } from '@/types'
import type { PortfolioData } from '@/lib/portfolio/types'

const SKILL_CATEGORY_LABELS: Record<SkillCategory, string> = {
  frontend: '프론트엔드',
  backend: '백엔드',
  db: '데이터베이스',
  devops: 'DevOps',
  etc: '기타',
}

const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  learning: '학습 중',
  familiar: '익숙',
  proficient: '능숙',
}

const LOG_CATEGORY_LABELS = {
  cs: 'CS',
  trend: '트렌드',
  etc: '기타',
} as const

const SKILL_CATEGORY_ORDER: SkillCategory[] = ['frontend', 'backend', 'db', 'devops', 'etc']

export function generateMarkdown(data: PortfolioData): string {
  const { profile, projects, skills, logs } = data
  const lines: string[] = []

  const name = profile.display_name ?? profile.username
  const generatedAt = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  lines.push(`# ${name} 포트폴리오`)
  lines.push('')
  lines.push(`> 생성일: ${generatedAt}`)
  lines.push('')

  // ── 프로젝트 ──
  lines.push(`## 프로젝트 (${projects.length}개)`)
  lines.push('')

  if (projects.length === 0) {
    lines.push('_등록된 프로젝트가 없습니다._')
    lines.push('')
  } else {
    for (const p of projects) {
      lines.push(`### ${p.name}`)
      lines.push('')
      lines.push(`- **기간**: ${p.started_at} ~ ${p.ended_at ?? '진행 중'}`)
      if (p.role) lines.push(`- **역할**: ${p.role}`)
      if (p.tech_stack.length > 0) lines.push(`- **기술**: ${p.tech_stack.join(', ')}`)
      if (p.github_url) lines.push(`- **GitHub**: ${p.github_url}`)
      if (p.demo_url) lines.push(`- **데모**: ${p.demo_url}`)
      lines.push('')
      lines.push(p.description.trim())
      lines.push('')
      lines.push('---')
      lines.push('')
    }
  }

  // ── 기술 스택 ──
  lines.push('## 기술 스택')
  lines.push('')

  const grouped = SKILL_CATEGORY_ORDER.reduce<Record<SkillCategory, Skill[]>>(
    (acc, cat) => {
      acc[cat] = skills.filter((s) => s.category === cat)
      return acc
    },
    { frontend: [], backend: [], db: [], devops: [], etc: [] },
  )

  const visibleCats = SKILL_CATEGORY_ORDER.filter((cat) => grouped[cat].length > 0)

  if (visibleCats.length === 0) {
    lines.push('_등록된 기술이 없습니다._')
    lines.push('')
  } else {
    for (const cat of visibleCats) {
      lines.push(`### ${SKILL_CATEGORY_LABELS[cat]}`)
      for (const s of grouped[cat]) {
        lines.push(`- ${s.name} — ${SKILL_LEVEL_LABELS[s.level]}`)
      }
      lines.push('')
    }
  }

  // ── 최근 학습 기록 ──
  lines.push(`## 최근 학습 기록 (${logs.length}개)`)
  lines.push('')

  if (logs.length === 0) {
    lines.push('_등록된 학습 기록이 없습니다._')
    lines.push('')
  } else {
    for (const log of logs) {
      lines.push(`### ${log.title} · ${log.learned_at}`)
      lines.push('')
      lines.push(`- **카테고리**: ${LOG_CATEGORY_LABELS[log.category]}`)
      if (log.tags.length > 0) {
        lines.push(`- **태그**: ${log.tags.map((t) => '#' + t).join(' ')}`)
      }
      lines.push('')
      lines.push(log.content.trim())
      lines.push('')
      lines.push('---')
      lines.push('')
    }
  }

  return lines.join('\n')
}
