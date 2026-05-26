'use client'

import { useRef } from 'react'

interface DeleteButtonProps {
  deleteAction: (_formData: FormData) => Promise<void>
}

export default function DeleteButton({ deleteAction }: DeleteButtonProps) {
  const formRef = useRef<HTMLFormElement>(null)

  function handleClick() {
    if (window.confirm('이 기록을 삭제하시겠습니까?')) {
      formRef.current?.requestSubmit()
    }
  }

  return (
    <form ref={formRef} action={deleteAction}>
      <button
        type="button"
        onClick={handleClick}
        className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 border border-red-900/50 hover:border-red-800 rounded-lg transition-colors"
      >
        삭제
      </button>
    </form>
  )
}
