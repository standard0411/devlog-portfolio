'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { LogCategory } from '@/types'

export type UpdateLogState = { error: string } | null

export type AddLogState = {
  error: string
} | null

export async function addLog(prevState: AddLogState, formData: FormData): Promise<AddLogState> {
  const title = (formData.get('title') as string).trim()
  const category = formData.get('category') as string
  const content = (formData.get('content') as string).trim()
  const learnedAt = formData.get('learned_at') as string
  const tagsRaw = ((formData.get('tags') ?? '') as string).trim()

  if (!title || !category || !content || !learnedAt) {
    return { error: '필수 항목을 모두 입력해주세요.' }
  }

  const validCategories: LogCategory[] = ['cs', 'trend', 'etc']
  if (!validCategories.includes(category as LogCategory)) {
    return { error: '올바른 카테고리를 선택해주세요.' }
  }

  const tags = tagsRaw
    ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
    : []

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  const { error } = await supabase.from('logs').insert({
    user_id: user.id,
    title,
    category: category as LogCategory,
    content,
    learned_at: learnedAt,
    tags,
  })

  if (error) {
    return { error: '저장에 실패했습니다. 잠시 후 다시 시도해주세요.' }
  }

  redirect('/logs')
}

export async function updateLog(
  id: string,
  prevState: UpdateLogState,
  formData: FormData,
): Promise<UpdateLogState> {
  const title = (formData.get('title') as string).trim()
  const category = formData.get('category') as string
  const content = (formData.get('content') as string).trim()
  const learnedAt = formData.get('learned_at') as string
  const tagsRaw = ((formData.get('tags') ?? '') as string).trim()

  if (!title || !category || !content || !learnedAt) {
    return { error: '필수 항목을 모두 입력해주세요.' }
  }

  const validCategories: LogCategory[] = ['cs', 'trend', 'etc']
  if (!validCategories.includes(category as LogCategory)) {
    return { error: '올바른 카테고리를 선택해주세요.' }
  }

  const tags = tagsRaw
    ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
    : []

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: '로그인이 필요합니다.' }
  }

  const { error } = await supabase
    .from('logs')
    .update({ title, category: category as LogCategory, content, learned_at: learnedAt, tags })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: '수정에 실패했습니다. 잠시 후 다시 시도해주세요.' }
  }

  redirect(`/logs/${id}`)
}

export async function deleteLog(id: string, _formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  await supabase
    .from('logs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  redirect('/logs')
}
