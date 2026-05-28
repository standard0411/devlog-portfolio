'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { SkillCategory, SkillLevel } from '@/types'
import { revalidatePortfolio } from '@/lib/portfolio/revalidatePortfolio'

const VALID_CATEGORIES: SkillCategory[] = ['frontend', 'backend', 'db', 'devops', 'etc']
const VALID_LEVELS: SkillLevel[] = ['learning', 'familiar', 'proficient']

export type SkillState = { error: string } | null

export async function addSkill(prevState: SkillState, formData: FormData): Promise<SkillState> {
  const name = (formData.get('name') as string).trim()
  const category = (formData.get('category') as string).trim()
  const level = (formData.get('level') as string).trim()

  if (!name || !category || !level) {
    return { error: '모든 항목을 입력해주세요.' }
  }

  if (!VALID_CATEGORIES.includes(category as SkillCategory)) {
    return { error: '올바른 카테고리를 선택해주세요.' }
  }
  if (!VALID_LEVELS.includes(level as SkillLevel)) {
    return { error: '올바른 숙련도를 선택해주세요.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  const { error } = await supabase.from('skills').insert({
    user_id: user.id,
    name,
    category: category as SkillCategory,
    level: level as SkillLevel,
  })

  if (error) {
    return { error: '저장에 실패했습니다. 잠시 후 다시 시도해주세요.' }
  }

  revalidatePath('/skills')
  await revalidatePortfolio(user.id, supabase)
  redirect('/skills')
}

export type UpdateSkillState = { error: string } | null

export async function updateSkill(
  id: string,
  prevState: UpdateSkillState,
  formData: FormData,
): Promise<UpdateSkillState> {
  const name = (formData.get('name') as string).trim()
  const category = (formData.get('category') as string).trim()
  const level = (formData.get('level') as string).trim()

  if (!name || !category || !level) {
    return { error: '모든 항목을 입력해주세요.' }
  }

  if (!VALID_CATEGORIES.includes(category as SkillCategory)) {
    return { error: '올바른 카테고리를 선택해주세요.' }
  }
  if (!VALID_LEVELS.includes(level as SkillLevel)) {
    return { error: '올바른 숙련도를 선택해주세요.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  const { error } = await supabase
    .from('skills')
    .update({
      name,
      category: category as SkillCategory,
      level: level as SkillLevel,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: '수정에 실패했습니다. 잠시 후 다시 시도해주세요.' }
  }

  revalidatePath('/skills')
  await revalidatePortfolio(user.id, supabase)
  redirect('/skills')
}

export async function deleteSkill(id: string, _formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  await supabase
    .from('skills')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  revalidatePath('/skills')
  await revalidatePortfolio(user.id, supabase)
  redirect('/skills')
}
