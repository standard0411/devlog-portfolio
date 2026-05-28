import type { SupabaseClient } from '@supabase/supabase-js'
import { generateUniqueUsername } from './username'

export async function ensureProfile(
  userId: string,
  email: string,
  supabase: SupabaseClient,
): Promise<void> {
  const { data: existing } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) return

  const username = await generateUniqueUsername(email, supabase)

  // upsert with ignoreDuplicates handles concurrent calls for same user_id
  const { error } = await supabase
    .from('profiles')
    .upsert({ user_id: userId, username }, { onConflict: 'user_id', ignoreDuplicates: true })

  if (error) throw error

  // Verify row exists — detects username conflict (different user_id took same username)
  const { data: created } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (!created) throw new Error('프로필 생성에 실패했습니다.')
}
