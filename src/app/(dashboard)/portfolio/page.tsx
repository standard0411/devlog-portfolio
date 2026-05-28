import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buildPortfolioData } from '@/lib/portfolio/buildPortfolioData'
import { generateMarkdown } from './generateMarkdown'
import MarkdownPanel from './MarkdownPanel'

export default async function PortfolioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const data = await buildPortfolioData(supabase, user.id)

  const markdown = data
    ? generateMarkdown(data)
    : generateMarkdown({
        profile: { username: user.email?.split('@')[0] ?? 'user', display_name: null, bio: null, github_url: null, website_url: null },
        projects: [],
        skills: [],
        logs: [],
      })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">포트폴리오</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            프로젝트 {data?.projects.length ?? 0}개 · 기술 {data?.skills.length ?? 0}개 · 학습 기록 {data?.logs.length ?? 0}개
          </p>
        </div>
      </div>

      <MarkdownPanel markdown={markdown} />
    </div>
  )
}
