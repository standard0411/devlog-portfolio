import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createPublicClient } from '@/lib/supabase/public'
import { buildPortfolioData } from '@/lib/portfolio/buildPortfolioData'
import PortfolioView from './PortfolioView'

export const revalidate = 3600

type Props = { params: Promise<{ username: string }> }

async function fetchProfile(username: string) {
  const supabase = createPublicClient()
  const { data } = await supabase
    .from('profiles')
    .select('user_id, display_name, bio')
    .eq('username', username)
    .single()
  return data
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const profile = await fetchProfile(username)
  if (!profile) return { title: '포트폴리오를 찾을 수 없습니다' }
  return {
    title: `${profile.display_name ?? username}의 포트폴리오`,
    description: profile.bio ?? `${username}의 개발 포트폴리오`,
  }
}

export default async function PublicPortfolioPage({ params }: Props) {
  const { username } = await params
  const supabase = createPublicClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  const data = await buildPortfolioData(supabase, profile.user_id)
  if (!data) notFound()

  return <PortfolioView data={data} />
}
