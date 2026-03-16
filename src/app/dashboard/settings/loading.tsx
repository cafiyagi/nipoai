export default function SettingsLoading() {
  return (
    <div className="animate-pulse p-6">
      <div className="mx-auto max-w-2xl flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-4">
            <div className="h-10 w-10 shrink-0 rounded-lg bg-[var(--bg-hover)]" />
            <div className="flex-1">
              <div className="h-4 w-24 rounded bg-[var(--bg-hover)]" />
              <div className="mt-2 h-3 w-48 rounded bg-[var(--bg-secondary)]" />
            </div>
            <div className="h-5 w-16 rounded-full bg-[var(--bg-secondary)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
