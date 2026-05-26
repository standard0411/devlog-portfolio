'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { addSkill, updateSkill } from './actions'
import type { SkillState, UpdateSkillState } from './actions'
import type { Skill, SkillCategory, SkillLevel } from '@/types'

const CATEGORY_LABELS: Record<SkillCategory, string> = {
  frontend: '프론트엔드',
  backend: '백엔드',
  db: '데이터베이스',
  devops: 'DevOps',
  etc: '기타',
}

const LEVEL_LABELS: Record<SkillLevel, string> = {
  learning: '학습 중',
  familiar: '익숙',
  proficient: '능숙',
}

const CATEGORIES: SkillCategory[] = ['frontend', 'backend', 'db', 'devops', 'etc']
const LEVELS: SkillLevel[] = ['learning', 'familiar', 'proficient']

const inputClass =
  'w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors'
const selectClass = inputClass

export function AddSkillForm() {
  const [state, formAction, isPending] = useActionState<SkillState, FormData>(addSkill, null)

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
      <h2 className="text-sm font-medium text-zinc-300 mb-3">기술 추가</h2>
      <form action={formAction} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="add-name" className="block text-xs text-zinc-500 mb-1">
              기술 이름 <span className="text-red-500">*</span>
            </label>
            <input
              id="add-name"
              name="name"
              type="text"
              required
              placeholder="예) React, PostgreSQL"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="add-category" className="block text-xs text-zinc-500 mb-1">
              카테고리 <span className="text-red-500">*</span>
            </label>
            <select id="add-category" name="category" required className={selectClass}>
              <option value="">선택</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="add-level" className="block text-xs text-zinc-500 mb-1">
              숙련도 <span className="text-red-500">*</span>
            </label>
            <select id="add-level" name="level" required className={selectClass}>
              <option value="">선택</option>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {LEVEL_LABELS[l]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {state?.error && (
          <p className="text-xs text-red-400">{state.error}</p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:opacity-70 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isPending ? '저장 중...' : '추가하기'}
          </button>
        </div>
      </form>
    </div>
  )
}

export function EditSkillForm({ skill }: { skill: Skill }) {
  const boundUpdate = updateSkill.bind(null, skill.id)
  const [state, formAction, isPending] = useActionState<UpdateSkillState, FormData>(boundUpdate, null)

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label htmlFor={`edit-name-${skill.id}`} className="block text-xs text-zinc-500 mb-1">
            기술 이름 <span className="text-red-500">*</span>
          </label>
          <input
            id={`edit-name-${skill.id}`}
            name="name"
            type="text"
            required
            defaultValue={skill.name}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor={`edit-category-${skill.id}`} className="block text-xs text-zinc-500 mb-1">
            카테고리 <span className="text-red-500">*</span>
          </label>
          <select
            id={`edit-category-${skill.id}`}
            name="category"
            required
            defaultValue={skill.category}
            className={selectClass}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`edit-level-${skill.id}`} className="block text-xs text-zinc-500 mb-1">
            숙련도 <span className="text-red-500">*</span>
          </label>
          <select
            id={`edit-level-${skill.id}`}
            name="level"
            required
            defaultValue={skill.level}
            className={selectClass}
          >
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {LEVEL_LABELS[l]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {state?.error && (
        <p className="text-xs text-red-400">{state.error}</p>
      )}

      <div className="flex gap-2 justify-end">
        <Link
          href="/skills"
          className="px-4 py-2 border border-zinc-700 hover:border-zinc-600 text-zinc-400 hover:text-white text-sm font-medium rounded-lg transition-colors"
        >
          취소
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:opacity-70 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {isPending ? '저장 중...' : '수정 완료'}
        </button>
      </div>
    </form>
  )
}
