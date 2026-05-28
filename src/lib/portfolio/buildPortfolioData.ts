import type { SupabaseClient } from '@supabase/supabase-js'
import type { PortfolioData } from './types'
import type { Project, Skill, Log } from '@/types'

export async function buildPortfolioData(
  supabase: SupabaseClient,
  userId: string,
): Promise<PortfolioData | null> {
  const [profileResult, projectsResult, skillsResult, logsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('username, display_name, bio, github_url, website_url')
      .eq('user_id', userId)
      .single(),
    supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false }),
    supabase
      .from('skills')
      .select('*')
      .eq('user_id', userId)
      .order('category', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('logs')
      .select('*')
      .eq('user_id', userId)
      .order('learned_at', { ascending: false })
      .limit(10),
  ])

  if (!profileResult.data) return null

  return {
    profile: profileResult.data,
    projects: (projectsResult.data ?? []) as Project[],
    skills: (skillsResult.data ?? []) as Skill[],
    logs: (logsResult.data ?? []) as Log[],
  }
}
