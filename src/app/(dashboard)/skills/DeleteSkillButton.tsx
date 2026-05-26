'use client'

import { useRef } from 'react'

interface DeleteSkillButtonProps {
  deleteAction: (_formData: FormData) => Promise<void>
}

export default function DeleteSkillButton({ deleteAction }: DeleteSkillButtonProps) {
  const formRef = useRef<HTMLFormElement>(null)

  function handleClick() {
    if (window.confirm('이 기술을 삭제하시겠습니까?')) {
      formRef.current?.requestSubmit()
    }
  }

  return (
    <form ref={formRef} action={deleteAction}>
      <button
        type="button"
        onClick={handleClick}
        className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
        aria-label="삭제"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </form>
  )
}
