import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SettingsForm from './SettingsForm'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, bio, github_url, website_url, is_public')
    .eq('user_id', user.id)
    .single()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">설정</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          프로필 및 공개 포트폴리오 설정
        </p>
        {profile?.is_public && profile.username && (
          <a
            href={`/u/${profile.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-400 hover:text-indigo-300 mt-1 inline-block"
          >
            /u/{profile.username} ↗ (공개 포트폴리오)
          </a>
        )}
      </div>
      <SettingsForm profile={profile} />
    </div>
  )
}
