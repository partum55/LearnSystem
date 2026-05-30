'use client';

export function CourseCardSkeleton() {
  return (
    <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
      <div className="skeleton" style={{ height: 3 }} />
      <div style={{ padding: 15 }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="skeleton" style={{ height: 11, width: 64 }} />
          <div className="skeleton" style={{ height: 19, width: 60, borderRadius: 5 }} />
        </div>
        <div className="skeleton mb-2" style={{ height: 15, width: '75%' }} />
        <div className="skeleton mb-1" style={{ height: 13, width: '90%' }} />
        <div className="skeleton mb-4" style={{ height: 13, width: '60%' }} />
        <div className="skeleton" style={{ height: 3, borderRadius: 3 }} />
        <div className="mt-2 flex justify-between">
          <div className="skeleton" style={{ height: 11, width: 60 }} />
          <div className="skeleton" style={{ height: 11, width: 30 }} />
        </div>
      </div>
    </div>
  );
}

export function CoursesPageSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <div className="flex items-end justify-between">
        <div>
          <div className="skeleton mb-2" style={{ height: 10, width: 80 }} />
          <div className="skeleton mb-2" style={{ height: 24, width: 120 }} />
          <div className="skeleton" style={{ height: 14, width: 220 }} />
        </div>
      </div>
      <div className="border-b" style={{ borderColor: 'var(--border-default)', paddingBottom: 1 }}>
        <div className="flex gap-1">
          <div className="skeleton" style={{ height: 38, width: 120 }} />
          <div className="skeleton" style={{ height: 38, width: 100 }} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <CourseCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function ModulesSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="card" style={{ overflow: 'hidden' }}>
          <div className="flex items-center gap-2.5 p-3">
            <div className="skeleton" style={{ height: 16, width: 16 }} />
            <div className="skeleton" style={{ height: 12, width: 22 }} />
            <div className="skeleton flex-1" style={{ height: 14 }} />
            <div className="skeleton" style={{ height: 20, width: 60, borderRadius: 5 }} />
          </div>
          <div style={{ padding: '4px 15px 14px' }}>
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex items-center gap-2.5 py-2.5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <div className="skeleton" style={{ height: 28, width: 28, borderRadius: 6, flexShrink: 0 }} />
                <div className="flex-1">
                  <div className="skeleton mb-1.5" style={{ height: 13, width: '65%' }} />
                  <div className="skeleton" style={{ height: 10, width: 50 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
