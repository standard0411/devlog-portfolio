import { NextResponse } from 'next/server'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

  return NextResponse.json({
    url_set: url.length > 0,
    url_starts_https: url.startsWith('https://'),
    url_prefix: url.substring(0, 15) || '(empty)',
    key_set: key.length > 0,
    key_length: key.length,
  })
}
