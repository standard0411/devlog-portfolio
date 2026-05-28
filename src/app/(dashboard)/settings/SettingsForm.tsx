'use client'

import { useActionState } from 'react'
import { updateProfile } from './actions'
import type { SettingsState } from './actions'

const inputClass =
  'w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors'

interface ProfileData {
  username: string
  display_name: string | null
  bio: string | null
  github_url: string | null
  website_url: string | null
  is_public: boolean
}

export default function SettingsForm({ profile }: { profile: ProfileData | null }) {
  const [state, formAction, isPending] = useActionState<SettingsState, FormData>(
    updateProfile,
    null,
  )

  return (
    <form action={formAction} className="space-y-5 max-w-lg">

      {/* username */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">
          사용자명 (공개 URL)
        </label>
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500 text-sm">/u/</span>
          <input
            name="username"
            defaultValue={profile?.username ?? ''}
            required
            placeholder="your-username"
            className={inputClass}
          />
        </div>
        <p className="text-xs text-zinc-600 mt-1">소문자 영문, 숫자, 하이픈 · 3~30자</p>
      </div>

      {/* display_name */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">표시 이름</label>
        <input
          name="display_name"
          defaultValue={profile?.display_name ?? ''}
          placeholder="홍길동"
          className={inputClass}
        />
      </div>

      {/* bio */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">소개</label>
        <textarea
          name="bio"
          defaultValue={profile?.bio ?? ''}
          rows={3}
          placeholder="간단한 자기소개"
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* github_url */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">GitHub URL</label>
        <input
          name="github_url"
          type="url"
          defaultValue={profile?.github_url ?? ''}
          placeholder="https://github.com/username"
          className={inputClass}
        />
      </div>

      {/* website_url */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">웹사이트 URL</label>
        <input
          name="website_url"
          type="url"
          defaultValue={profile?.website_url ?? ''}
          placeholder="https://yourblog.com"
          className={inputClass}
        />
      </div>

      {/* is_public */}
      <div className="flex items-center gap-3 py-2">
        <input
          type="checkbox"
          id="is_public"
          name="is_public"
          value="true"
          defaultChecked={profile?.is_public ?? false}
          className="w-4 h-4 accent-indigo-500"
        />
        <label htmlFor="is_public" className="text-sm text-zinc-300 cursor-pointer">
          포트폴리오 공개 허용
        </label>
      </div>

      {state?.error && (
        <div className="flex items-start gap-2.5 text-sm text-red-400 bg-red-950/50 border border-red-900/60 rounded-lg px-3.5 py-2.5">
          <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:opacity-70 text-white text-sm font-medium rounded-lg transition-colors"
      >
        {isPending ? '저장 중...' : '저장하기'}
      </button>
    </form>
  )
}
