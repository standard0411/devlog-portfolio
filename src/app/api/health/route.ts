import { NextResponse } from 'next/server'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

  const envInfo = {
    url_set: url.length > 0,
    url_starts_https: url.startsWith('https://'),
    url_prefix: url.substring(0, 30) || '(empty)',
    key_set: key.length > 0,
    key_length: key.length,
    key_prefix: key.substring(0, 15) || '(empty)',
    key_suffix: key.slice(-5) || '(empty)',
  }

  // Supabase auth 서버에 직접 요청해서 응답 확인
  let authTest: Record<string, unknown> = {}
  if (url.startsWith('https://') && key) {
    try {
      const res = await fetch(`${url}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': key,
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({ email: 'health-check-test@example.com', password: 'test-password-123' }),
      })

      const text = await res.text()
      authTest = {
        status: res.status,
        ok: res.ok,
        body_length: text.length,
        body_preview: text.substring(0, 200),
      }
    } catch (e) {
      authTest = { error: e instanceof Error ? e.message : String(e) }
    }
  }

  return NextResponse.json({ env: envInfo, auth_test: authTest })
}
