'use client'

import { useState } from 'react'
import type { Log } from '@/types'
import MarkdownContent from './MarkdownContent'

export default function LogCard({ log }: { log: Log }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <article className="pb-8 border-b border-zinc-800/50 last:border-0 last:pb-0">
      <div className="flex items-baseline gap-3 mb-3">
        <h3 className="font-semibold text-zinc-100">{log.title}</h3>
        <span className="text-xs text-zinc-500 shrink-0">{log.learned_at}</span>
      </div>

      <div className={`relative ${!expanded ? 'max-h-24 overflow-hidden' : ''}`}>
        <MarkdownContent content={log.content} />
        {!expanded && (
          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-zinc-950 to-transparent" />
        )}
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 text-xs text-zinc-400 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 px-3 py-1 rounded-full transition-colors"
      >
        {expanded ? '접기 ↑' : '더 보기 ↓'}
      </button>

      {log.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {log.tags.map((t) => (
            <span key={t} className="text-xs text-zinc-600 bg-zinc-800/50 px-2 py-0.5 rounded">
              #{t}
            </span>
          ))}
        </div>
      )}
    </article>
  )
}
