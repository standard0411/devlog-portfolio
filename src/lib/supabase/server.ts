import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// 서버(Server Component, Route Handler)에서 Supabase에 접근할 때 사용
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

  if (!url.startsWith('https://') || !key) {
    throw new Error(
      'Supabase 환경변수가 설정되지 않았습니다. .env.local의 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 확인하세요.'
    )
  }

  const cookieStore = await cookies()

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component에서는 쿠키 설정 불가 (무시해도 됨)
          }
        },
      },
    }
  )
}
