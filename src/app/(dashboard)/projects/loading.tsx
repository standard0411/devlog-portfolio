export default function ProjectsLoading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-20 bg-zinc-800 rounded-lg animate-pulse" />
        <div className="h-9 w-28 bg-zinc-800 rounded-lg animate-pulse" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="h-5 w-1/2 bg-zinc-800 rounded animate-pulse" />
              <div className="h-5 w-14 bg-zinc-800 rounded-full animate-pulse" />
            </div>
            <div className="h-4 w-1/3 bg-zinc-800 rounded animate-pulse mb-2.5" />
            <div className="h-4 w-full bg-zinc-800 rounded animate-pulse mb-1.5" />
            <div className="h-4 w-2/3 bg-zinc-800 rounded animate-pulse mb-3" />
            <div className="flex gap-1.5">
              <div className="h-5 w-16 bg-zinc-800 rounded animate-pulse" />
              <div className="h-5 w-20 bg-zinc-800 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
