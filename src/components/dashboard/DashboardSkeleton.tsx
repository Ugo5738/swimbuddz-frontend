export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Greeting skeleton */}
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-slate-200" />
        <div className="flex-1 space-y-2">
          <div className="h-6 w-48 rounded bg-slate-200" />
          <div className="h-4 w-64 rounded bg-slate-200" />
        </div>
      </div>

      {/* Stats overview skeleton */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="h-4 w-32 rounded bg-slate-200 mb-5" />
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="h-[130px] w-[130px] rounded-full bg-slate-200" />
          <div className="grid grid-cols-2 gap-3 flex-1 w-full">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                <div className="h-10 w-10 rounded-lg bg-slate-200" />
                <div className="space-y-1.5">
                  <div className="h-5 w-12 rounded bg-slate-200" />
                  <div className="h-3 w-16 rounded bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Next session skeleton */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="h-3 w-24 rounded bg-slate-200 mb-2" />
        <div className="h-5 w-48 rounded bg-slate-200 mb-3" />
        <div className="h-4 w-64 rounded bg-slate-200" />
      </div>

      {/* Quick actions skeleton */}
      <div className="flex gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <div className="h-14 w-14 rounded-2xl bg-slate-200" />
            <div className="h-3 w-10 rounded bg-slate-200" />
          </div>
        ))}
      </div>

      {/* Calendar skeleton */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="h-4 w-28 rounded bg-slate-200 mb-3" />
        <div className="h-28 w-full rounded bg-slate-100" />
      </div>
    </div>
  );
}
