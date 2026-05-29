import { notFound, permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createPublicClient } from '@/lib/supabase/public'
import { buildPortfolioData } from '@/lib/portfolio/buildPortfolioData'
import PortfolioView from './PortfolioView'

export const revalidate = 3600

type Props = { params: Promise<{ username: string }> }

type ResolveResult =
  | { type: 'found'; userId: string }
  | { type: 'redirect'; to: string }
  | { type: 'notfound' }

// username을 받아 현재 profiles 조회 → 없으면 history 조회 → redirect 대상 반환
async function resolveUsername(username: string): Promise<ResolveResult> {
  const supabase = createPublicClient()

  // 현재 활성 username 조회
  const { data: current } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('username', username)
    .single()

  if (current) return { type: 'found', userId: current.user_id }

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const supabase = createPublicClient()
  const { data } = await supabase
    .from('profiles')
    .select('display_name, bio')
    .eq('username', username)
    .single()
  if (!data) return { title: '포트폴리오를 찾을 수 없습니다' }
  return {
    title: `${data.display_name ?? username}의 포트폴리오`,
    description: data.bio ?? `${username}의 개발 포트폴리오`,
  }
}

export default async function PublicPortfolioPage({ params }: Props) {
  const { username } = await params
  const result = await resolveUsername(username)

  if (result.type === 'notfound') notFound()

  // 308 Permanent Redirect — 브라우저·검색엔진이 새 URL로 canonical 갱신
  if (result.type === 'redirect') permanentRedirect(`/u/${result.to}`)

  const supabase = createPublicClient()
  const data = await buildPortfolioData(supabase, result.userId)
  if (!data) notFound()

  return <PortfolioView data={data} />
}
