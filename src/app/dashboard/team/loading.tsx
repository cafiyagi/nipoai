export default function TeamLoading() {
  return (
    <div className="animate-pulse p-6">
      {/* Header skeleton */}
      <div className="mb-6 flex items-center justify-between">
        <div className="h-6 w-32 rounded bg-[var(--bg-hover)]" />
        <div className="h-9 w-28 rounded-lg bg-[var(--bg-hover)]" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)]">
        {/* Header row */}
        <div className="border-b border-[var(--border-primary)] px-4 py-3">
          <div className="flex gap-8">
            <div className="h-4 w-20 rounded bg-[var(--bg-hover)]" />
            <div className="h-4 w-16 rounded bg-[var(--bg-hover)]" />
            <div className="h-4 w-24 rounded bg-[var(--bg-hover)]" />
          </div>
        </div>
        {/* Rows */}
        {[0, 1].map((i) => (
          <div key={i} className="border-b border-[var(--border-primary)] px-4 py-4">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-[var(--bg-hover)]" />
                <div>
                  <div className="h-4 w-28 rounded bg-[var(--bg-hover)]" />
                  <div className="mt-1 h-3 w-40 rounded bg-[var(--bg-hover)]" />
                </div>
              </div>
              <div className="h-5 w-14 rounded-full bg-[var(--bg-hover)]" />
              <div className="h-4 w-20 rounded bg-[var(--bg-hover)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
