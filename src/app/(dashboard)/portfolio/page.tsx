import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Log, Project, Skill } from '@/types'
import { generateMarkdown } from './generateMarkdown'
import MarkdownPanel from './MarkdownPanel'

export default async function PortfolioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [
    { data: projectsData },
    { data: skillsData },
    { data: logsData },
  ] = await Promise.all([
    supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false }),
    supabase
      .from('skills')
      .select('*')
      .eq('user_id', user.id)
      .order('category', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('logs')
      .select('*')
      .eq('user_id', user.id)
      .order('learned_at', { ascending: false })
      .limit(10),
  ])

  const projects = (projectsData ?? []) as Project[]
  const skills = (skillsData ?? []) as Skill[]
  const logs = (logsData ?? []) as Log[]

  const markdown = generateMarkdown({
    projects,
    skills,
    logs,
    userEmail: user.email ?? '',
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">포트폴리오</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            프로젝트 {projects.length}개 · 기술 {skills.length}개 · 학습 기록 {logs.length}개
          </p>
        </div>
      </div>

      <MarkdownPanel markdown={markdown} />
    </div>
  )
}
