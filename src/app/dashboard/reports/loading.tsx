export default function ReportsLoading() {
  return (
    <div className="animate-pulse p-6">
      {/* Month filter skeleton */}
      <div className="mb-6 flex items-center justify-center gap-4">
        <div className="h-8 w-8 rounded bg-[var(--bg-hover)]" />
        <div className="h-5 w-32 rounded bg-[var(--bg-hover)]" />
        <div className="h-8 w-8 rounded bg-[var(--bg-hover)]" />
      </div>

      {/* Report list skeleton */}
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[var(--bg-hover)]" />
              <div className="flex-1">
                <div className="h-4 w-40 rounded bg-[var(--bg-hover)]" />
                <div className="mt-1.5 h-3 w-60 rounded bg-[var(--bg-hover)]" />
              </div>
              <div className="h-5 w-14 rounded-full bg-[var(--bg-hover)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
