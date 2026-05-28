import { createClient } from '@supabase/supabase-js'

export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

  if (!url.startsWith('https://') || !key) {
    throw new Error('Supabase 환경변수가 설정되지 않았습니다.')
  }

  return createClient(url, key)
}
