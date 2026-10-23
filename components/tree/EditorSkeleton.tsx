export function EditorSkeleton() {
  return (
    <div className="flex h-dvh flex-col" aria-busy="true" aria-label="Loading editor">
      <div className="flex h-14 items-center gap-3 border-b border-line bg-surface px-4">
        <div className="skeleton size-8 rounded-lg" />
        <div className="skeleton h-4 w-44 rounded" />
        <div className="ml-auto flex gap-2">
          <div className="skeleton size-9 rounded-lg" />
          <div className="skeleton size-9 rounded-lg" />
          <div className="skeleton h-9 w-24 rounded-lg" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-72 shrink-0 space-y-3 border-r border-line bg-surface p-4 lg:block">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="skeleton h-14 rounded-xl" />
          ))}
        </aside>
        <main className="relative flex-1 overflow-hidden">
          <div className="skeleton absolute left-3 top-3 h-11 w-80 rounded-xl" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-10">
            <div className="skeleton h-[108px] w-[252px] rounded-xl" />
            <div className="flex gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-[108px] w-[252px] rounded-xl" />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
