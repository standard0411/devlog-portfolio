'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ensureProfile } from '@/lib/profile'

export type LoginState = {
  error: string
} | null

export async function login(prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: '이메일과 비밀번호를 입력해주세요.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: '이메일 또는 비밀번호가 올바르지 않습니다.' }
  }

  // 기존 유저 중 profiles 행이 없는 경우 복구 목적 (가입 전 로그인한 계정 등)
  if (data.user) {
    try {
      await ensureProfile(data.user.id, data.user.email ?? email, supabase)
    } catch {
      // self-healing 실패는 로그인 자체를 막지 않음
    }
  }

  redirect('/logs')
}
