'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePortfolio } from '@/lib/portfolio/revalidatePortfolio'

export type ProjectState = { error: string } | null

export async function addProject(prevState: ProjectState, formData: FormData): Promise<ProjectState> {
  const name = (formData.get('name') as string).trim()
  const description = (formData.get('description') as string).trim()
  const role = ((formData.get('role') ?? '') as string).trim() || null
  const techStackRaw = (formData.get('tech_stack') as string).trim()
  const githubUrl = ((formData.get('github_url') ?? '') as string).trim() || null
  const demoUrl = ((formData.get('demo_url') ?? '') as string).trim() || null
  const startedAt = (formData.get('started_at') as string).trim()
  const endedAt = ((formData.get('ended_at') ?? '') as string).trim() || null

  if (!name || !description || !techStackRaw || !startedAt) {
    return { error: '필수 항목을 모두 입력해주세요.' }
  }

  if (githubUrl && !/^https?:\/\//.test(githubUrl)) {
    return { error: 'GitHub URL은 http:// 또는 https://로 시작해야 합니다.' }
  }
  if (demoUrl && !/^https?:\/\//.test(demoUrl)) {
    return { error: '데모 URL은 http:// 또는 https://로 시작해야 합니다.' }
  }

  const techStack = techStackRaw.split(',').map((t) => t.trim()).filter(Boolean)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  const { error } = await supabase.from('projects').insert({
    user_id: user.id,
    name,
    description,
    role,
    tech_stack: techStack,
    github_url: githubUrl,
    demo_url: demoUrl,
    started_at: startedAt,
    ended_at: endedAt,
  })

  if (error) {
    return { error: '저장에 실패했습니다. 잠시 후 다시 시도해주세요.' }
  }

  await revalidatePortfolio(user.id, supabase)
  redirect('/projects')
}

export type UpdateProjectState = { error: string } | null

export async function updateProject(
  id: string,
  prevState: UpdateProjectState,
  formData: FormData,
): Promise<UpdateProjectState> {
  const name = (formData.get('name') as string).trim()
  const description = (formData.get('description') as string).trim()
  const role = ((formData.get('role') ?? '') as string).trim() || null
  const techStackRaw = (formData.get('tech_stack') as string).trim()
  const githubUrl = ((formData.get('github_url') ?? '') as string).trim() || null
  const demoUrl = ((formData.get('demo_url') ?? '') as string).trim() || null
  const startedAt = (formData.get('started_at') as string).trim()
  const endedAt = ((formData.get('ended_at') ?? '') as string).trim() || null

  if (!name || !description || !techStackRaw || !startedAt) {
    return { error: '필수 항목을 모두 입력해주세요.' }
  }

  if (githubUrl && !/^https?:\/\//.test(githubUrl)) {
    return { error: 'GitHub URL은 http:// 또는 https://로 시작해야 합니다.' }
  }
  if (demoUrl && !/^https?:\/\//.test(demoUrl)) {
    return { error: '데모 URL은 http:// 또는 https://로 시작해야 합니다.' }
  }

  const techStack = techStackRaw.split(',').map((t) => t.trim()).filter(Boolean)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  const { error } = await supabase
    .from('projects')
    .update({
      name,
      description,
      role,
      tech_stack: techStack,
      github_url: githubUrl,
      demo_url: demoUrl,
      started_at: startedAt,
      ended_at: endedAt,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: '수정에 실패했습니다. 잠시 후 다시 시도해주세요.' }
  }

  await revalidatePortfolio(user.id, supabase)
  redirect(`/projects/${id}`)
}

export async function deleteProject(id: string, _formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  await supabase
    .from('projects')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  await revalidatePortfolio(user.id, supabase)
  redirect('/projects')
}
