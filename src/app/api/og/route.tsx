export const runtime = 'edge'

import { ImageResponse } from 'next/og'
import { createPublicClient } from '@/lib/supabase/public'

// Old Safari UA → Google Fonts API returns WOFF (not WOFF2), which Satori supports
const SAFARI_UA =
  'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1'

async function loadKoreanFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700&text=${encodeURIComponent(text)}`,
      { headers: { 'User-Agent': SAFARI_UA } },
    ).then((r) => r.text())

    const url = css.match(/url\((.+?)\)/)?.[1]
    if (!url) return null
    return fetch(url).then((r) => r.arrayBuffer())
  } catch {
    return null
  }
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username') ?? ''
  if (!username) return new Response('Missing username', { status: 400 })

  try {
    const supabase = createPublicClient()

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, display_name, bio')
      .eq('username', username)
      .eq('is_public', true)
      .single()

    if (!profile) return new Response('Not found', { status: 404 })

    const [{ count: projectCount }, { count: skillCount }] = await Promise.all([
      supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.user_id),
      supabase
        .from('skills')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.user_id),
    ])

    const displayName = profile.display_name ?? username
    const bio = profile.bio ?? `${displayName}의 개발 프로젝트와 기술 스택`
    const bioDisplay = bio.length > 60 ? bio.slice(0, 60) + '…' : bio

    const fontData = await loadKoreanFont(
      `${displayName}${bio}DevLog프로젝트기술스택`,
    )
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#09090b',
            padding: '64px 72px',
            fontFamily: 'NotoSansKR, sans-serif',
          }}
        >
          {/* Brand */}
          <div style={{ display: 'flex', marginBottom: 'auto' }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: '#6366f1', letterSpacing: '-0.02em' }}>
              DevLog
            </span>
          </div>

          {/* Identity */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 48 }}>
            <div
              style={{
                fontSize: 64,
                fontWeight: 700,
                color: '#ffffff',
                lineHeight: 1.1,
                letterSpacing: '-0.03em',
              }}
            >
              {displayName}
            </div>
            <div style={{ fontSize: 26, color: '#a1a1aa', lineHeight: 1.5 }}>
              {bioDisplay}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 16 }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#18181b',
                borderRadius: 12,
                padding: '18px 32px',
                minWidth: 150,
              }}
            >
              <span style={{ fontSize: 40, fontWeight: 700, color: '#ffffff', lineHeight: 1 }}>
                {projectCount ?? 0}
              </span>
              <span style={{ fontSize: 16, color: '#71717a', marginTop: 6 }}>프로젝트</span>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#18181b',
                borderRadius: 12,
                padding: '18px 32px',
                minWidth: 150,
              }}
            >
              <span style={{ fontSize: 40, fontWeight: 700, color: '#ffffff', lineHeight: 1 }}>
                {skillCount ?? 0}
              </span>
              <span style={{ fontSize: 16, color: '#71717a', marginTop: 6 }}>기술 스택</span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: fontData
          ? [{ name: 'NotoSansKR', data: fontData, weight: 700 as const, style: 'normal' as const }]
          : [],
        headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
      },
    )
  } catch (e) {
    console.error('[OG]', e)
    return new Response('Failed to generate image', { status: 500 })
  }
}
