// 공부 기록
export type LogCategory = 'cs' | 'trend' | 'etc'

export interface Log {
  id: string
  user_id: string
  title: string
  category: LogCategory
  content: string
  tags: string[]
  learned_at: string // ISO date string (YYYY-MM-DD)
  created_at: string
}

export type LogInsert = Omit<Log, 'id' | 'user_id' | 'created_at'>
export type LogUpdate = Partial<LogInsert>

// 프로젝트 기록
export interface Project {
  id: string
  user_id: string
  name: string
  description: string
  role: string | null
  tech_stack: string[]
  github_url: string | null
  demo_url: string | null
  started_at: string       // NOT NULL — 시작일은 필수
  ended_at: string | null  // null이면 진행 중
  created_at: string
}

export type ProjectInsert = Omit<Project, 'id' | 'user_id' | 'created_at'>
export type ProjectUpdate = Partial<ProjectInsert>

// 기술 스택
export type SkillCategory = 'frontend' | 'backend' | 'db' | 'devops' | 'etc'
export type SkillLevel = 'learning' | 'familiar' | 'proficient'

export interface Skill {
  id: string
  user_id: string
  name: string
  category: SkillCategory
  level: SkillLevel
  created_at: string
}

export type SkillInsert = Omit<Skill, 'id' | 'user_id' | 'created_at'>
