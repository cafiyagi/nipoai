export default function DashboardLoading() {
  return (
    <div className="animate-pulse p-6">
      {/* Hero skeleton */}
      <div className="mb-6 h-8 w-64 rounded bg-[var(--bg-hover)]" />
      <div className="mb-8 h-5 w-40 rounded bg-[var(--bg-secondary)]" />

      {/* Today report card skeleton */}
      <div className="mb-6 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-5">
        <div className="flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-[var(--bg-hover)]" />
          <div className="flex-1">
            <div className="h-4 w-24 rounded bg-[var(--bg-hover)]" />
            <div className="mt-2 h-3 w-48 rounded bg-[var(--bg-secondary)]" />
          </div>
          <div className="h-9 w-28 rounded-lg bg-[var(--bg-hover)]" />
        </div>
      </div>

      {/* Stats row skeleton */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-4">
            <div className="h-4 w-20 rounded bg-[var(--bg-hover)]" />
            <div className="mt-2 h-3 w-32 rounded bg-[var(--bg-secondary)]" />
          </div>
        ))}
      </div>

      {/* Recent reports skeleton */}
      <div className="mb-4 h-5 w-24 rounded bg-[var(--bg-hover)]" />
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] p-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-[var(--bg-hover)]" />
              <div className="flex-1">
                <div className="h-4 w-36 rounded bg-[var(--bg-hover)]" />
                <div className="mt-1.5 h-3 w-56 rounded bg-[var(--bg-secondary)]" />
              </div>
              <div className="h-5 w-12 rounded-full bg-[var(--bg-secondary)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
