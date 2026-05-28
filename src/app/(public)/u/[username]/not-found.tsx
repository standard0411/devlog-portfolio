import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-zinc-500 text-sm mb-4">포트폴리오를 찾을 수 없습니다.</p>
        <Link href="/" className="text-indigo-400 hover:text-indigo-300 text-sm">
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  )
}
