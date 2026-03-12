export default function SettingsLoading() {
  return (
    <div className="animate-pulse p-6">
      <div className="mx-auto max-w-2xl flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4">
            <div className="h-10 w-10 shrink-0 rounded-lg bg-gray-200" />
            <div className="flex-1">
              <div className="h-4 w-24 rounded bg-gray-200" />
              <div className="mt-2 h-3 w-48 rounded bg-gray-100" />
            </div>
            <div className="h-5 w-16 rounded-full bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
