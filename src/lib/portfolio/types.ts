import type { Project, Skill, Log } from '@/types'

export interface PortfolioProfile {
  username: string
  display_name: string | null
  bio: string | null
  github_url: string | null
  website_url: string | null
}

export interface PortfolioData {
  profile: PortfolioProfile
  projects: Project[]
  skills: Skill[]
  logs: Log[]
}
