export default function LogsLoading() {
  return (
    <div>
      {/* 헤더 스켈레톤 */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-24 bg-zinc-800 rounded-lg animate-pulse" />
        <div className="h-9 w-24 bg-zinc-800 rounded-lg animate-pulse" />
      </div>

      {/* 카드 스켈레톤 */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex gap-2 mb-3">
              <div className="h-5 w-12 bg-zinc-800 rounded-full animate-pulse" />
              <div className="h-5 w-20 bg-zinc-800 rounded animate-pulse" />
            </div>
            <div className="h-5 w-3/4 bg-zinc-800 rounded animate-pulse mb-2.5" />
            <div className="h-4 w-full bg-zinc-800 rounded animate-pulse mb-1.5" />
            <div className="h-4 w-2/3 bg-zinc-800 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
