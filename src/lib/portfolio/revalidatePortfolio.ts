import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function revalidatePortfolio(
  userId: string,
  supabase: SupabaseClient,
): Promise<void> {
  const { data } = await supabase
    .from('profiles')
    .select('username, is_public')
    .eq('user_id', userId)
    .single()

  if (data?.is_public && data?.username) {
    revalidatePath(`/u/${data.username}`, 'page')
  }
}
