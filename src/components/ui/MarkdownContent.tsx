'use client'

import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'

const components: Components = {
  // 제목
  h1: ({ children }) => (
    <h1 className="text-base font-bold text-zinc-100 mt-5 mb-2 first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-sm font-bold text-zinc-200 mt-4 mb-2 first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-zinc-300 mt-3 mb-1 first:mt-0">{children}</h3>
  ),

  // 본문
  p: ({ children }) => (
    <p className="text-sm text-zinc-400 leading-relaxed mb-3 last:mb-0">{children}</p>
  ),

  // 굵은 글씨
  strong: ({ children }) => (
    <strong className="font-semibold text-zinc-200">{children}</strong>
  ),

  // 이탤릭
  em: ({ children }) => (
    <em className="italic text-zinc-300">{children}</em>
  ),

  // 인라인 코드
  code: ({ children, className }) => {
    const isBlock = className?.startsWith('language-')
    if (isBlock) {
      return (
        <code className="block bg-zinc-900 border border-zinc-800 rounded text-xs text-emerald-300 font-mono p-3 overflow-x-auto whitespace-pre">
          {children}
        </code>
      )
    }
    return (
      <code className="bg-zinc-800 text-emerald-300 font-mono text-xs px-1.5 py-0.5 rounded">
        {children}
      </code>
    )
  },

  // 코드 블록 wrapper
  pre: ({ children }) => (
    <pre className="my-3 last:mb-0">{children}</pre>
  ),

  // 순서 없는 목록
  ul: ({ children }) => (
    <ul className="text-sm text-zinc-400 space-y-1 pl-4 mb-3 last:mb-0 list-none">
      {children}
    </ul>
  ),

  // 순서 있는 목록
  ol: ({ children }) => (
    <ol className="text-sm text-zinc-400 space-y-1 pl-4 mb-3 last:mb-0 list-none">
      {children}
    </ol>
  ),

  // 목록 항목
  li: ({ children }) => (
    <li className="flex gap-2 leading-relaxed">
      <span className="text-zinc-600 shrink-0 mt-0.5">•</span>
      <span>{children}</span>
    </li>
  ),

  // 구분선
  hr: () => <hr className="border-zinc-800 my-4" />,

  // 인용
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-zinc-700 pl-3 my-3 text-zinc-500 italic">
      {children}
    </blockquote>
  ),

  // 링크 — 외부 링크만 허용, href는 string으로 검증
  a: ({ href, children }) => {
    if (!href || !/^https?:\/\//.test(href)) return <span>{children}</span>
    return (
      <a
        href={href}
        className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    )
  },

  // 표
  table: ({ children }) => (
    <div className="overflow-x-auto my-3">
      <table className="w-full text-xs text-zinc-400 border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="text-left text-zinc-300 font-semibold border-b border-zinc-700 px-3 py-1.5">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-zinc-800 px-3 py-1.5">{children}</td>
  ),
}

interface MarkdownContentProps {
  content: string
  className?: string
}

export default function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  return (
    <div className={className}>
      {/* rehype-raw를 사용하지 않으므로 raw HTML은 렌더링되지 않음 */}
      <ReactMarkdown components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
