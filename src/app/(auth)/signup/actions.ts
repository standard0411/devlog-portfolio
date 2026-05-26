'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type SignupState = {
  error?: string
  success?: boolean
} | null

export async function signup(prevState: SignupState, formData: FormData): Promise<SignupState> {
  const email = (formData.get('email') as string).trim()
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!email || !password || !confirmPassword) {
    return { error: '모든 항목을 입력해주세요.' }
  }

  if (password.length < 6) {
    return { error: '비밀번호는 6자 이상이어야 합니다.' }
  }

  if (password !== confirmPassword) {
    return { error: '비밀번호가 일치하지 않습니다.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) {
    if (error.message.toLowerCase().includes('already registered')) {
      return { error: '이미 사용 중인 이메일입니다.' }
    }
    return { error: `[디버그] ${error.message}` }
  }

  // 이메일 인증 비활성화 시: 즉시 세션 발급 → /logs 로 이동
  if (data.session) {
    redirect('/logs')
  }

  // 이메일 인증 활성화 시: 인증 메일 발송 → 성공 화면 표시
  return { success: true }
}
