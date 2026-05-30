import { notFound, permanentRedirect } from 'next/navigation'
import { cache } from 'react'
import type { Metadata } from 'next'
import { createPublicClient } from '@/lib/supabase/public'
import { buildPortfolioData } from '@/lib/portfolio/buildPortfolioData'
import PortfolioView from './PortfolioView'

export const revalidate = 3600

type Props = { params: Promise<{ username: string }> }

type ResolveResult =
  | { type: 'found'; userId: string; displayName: string | null; bio: string | null }
  | { type: 'redirect'; to: string }
  | { type: 'notfound' }

async function resolveUsername(username: string): Promise<ResolveResult> {
  const supabase = createPublicClient()

  // 현재 활성 username 조회 — metadata에 쓸 display_name, bio도 함께 가져옴
  const { data: current } = await supabase
    .from('profiles')
    .select('user_id, display_name, bio')
    .eq('username', username)
    .single()

  if (current) return {
    type: 'found',
    userId: current.user_id,
    displayName: current.display_name,
    bio: current.bio,
  }

  // 구 username 이력 조회 (가장 최근 변경 기준)
  const { data: history } = await supabase
    .from('username_history')
    .select('user_id')
    .eq('old_username', username)
    .order('changed_at', { ascending: false })
    .limit(1)
    .single()

  if (!history) return { type: 'notfound' }

  // 해당 user_id의 현재 username 조회
  // anon RLS: is_public = true인 경우만 반환 → 비공개 계정은 notfound 처리
  const { data: target } = await supabase
    .from('profiles')
    .select('username')
    .eq('user_id', history.user_id)
    .single()

  if (!target) return { type: 'notfound' }

  return { type: 'redirect', to: target.username }
}

// generateMetadata와 페이지 컴포넌트가 같은 요청 내 DB 쿼리를 공유
const resolveUsernameCached = cache(resolveUsername)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const result = await resolveUsernameCached(username)

  // notfound: 404 페이지 색인 방지
  // redirect: 308이 검색엔진 canonical 갱신을 처리하므로 old URL은 noindex
  if (result.type !== 'found') {
    return { robots: { index: false, follow: false } }
  }

  const displayName = result.displayName ?? username
  const description = result.bio ?? `${displayName}의 개발 프로젝트와 기술 스택`

  const ogImage = `/api/og?username=${encodeURIComponent(username)}`

  return {
    title: `${displayName}의 포트폴리오`,
    description,
    alternates: {
      // metadataBase(layout.tsx)와 합성되어 절대 URL로 변환
      canonical: `/u/${username}`,
    },
    openGraph: {
      type: 'website',
      title: `${displayName}의 포트폴리오`,
      description,
      url: `/u/${username}`,
      siteName: 'DevLog',
      locale: 'ko_KR',
      images: [{ url: ogImage, width: 1200, height: 630, alt: `${displayName}의 포트폴리오` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${displayName}의 포트폴리오`,
      description,
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-snippet': -1,
      },
    },
  }
}

export default async function PublicPortfolioPage({ params }: Props) {
  const { username } = await params
  const result = await resolveUsernameCached(username)

  if (result.type === 'notfound') notFound()

  // 308 Permanent Redirect — 브라우저·검색엔진이 새 URL로 canonical 갱신
  if (result.type === 'redirect') permanentRedirect(`/u/${result.to}`)

  const supabase = createPublicClient()
  const data = await buildPortfolioData(supabase, result.userId)
  if (!data) notFound()

  return <PortfolioView data={data} />
}
