'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RESERVED } from '@/lib/username'

export type SettingsState = { error: string } | null

export async function updateProfile(
  prevState: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const username = (formData.get('username') as string).trim().toLowerCase()
  const displayName = (formData.get('display_name') as string).trim() || null
  const bio = (formData.get('bio') as string).trim() || null
  const githubUrl = (formData.get('github_url') as string).trim() || null
  const websiteUrl = (formData.get('website_url') as string).trim() || null
  // checkbox: 'true' when checked, null when unchecked
  const isPublic = formData.get('is_public') === 'true'

  if (!username || !/^[a-z0-9-]{3,30}$/.test(username)) {
    return { error: '사용자명은 소문자 영문, 숫자, 하이픈으로 3~30자여야 합니다.' }
  }
  if (RESERVED.includes(username)) {
    return { error: '사용할 수 없는 사용자명입니다.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const { data: oldProfile } = await supabase
    .from('profiles')
    .select('username')
    .eq('user_id', user.id)
    .single()

  const { error } = await supabase
    .from('profiles')
    .update({ username, display_name: displayName, bio, github_url: githubUrl, website_url: websiteUrl, is_public: isPublic })
    .eq('user_id', user.id)

  if (error) {
    if (error.code === '23505') return { error: '이미 사용 중인 사용자명입니다.' }
    return { error: '저장에 실패했습니다. 잠시 후 다시 시도해주세요.' }
  }

  // Revalidate old and new public portfolio URLs
  if (oldProfile?.username) revalidatePath(`/u/${oldProfile.username}`, 'page')
  revalidatePath(`/u/${username}`, 'page')

  redirect('/settings')
}
