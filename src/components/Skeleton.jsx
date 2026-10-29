export default function Skeleton({ className = '', height = 'h-4', width = 'w-full' }) {
  return (
    <div className={`animate-pulse bg-slate-200 rounded ${height} ${width} ${className}`} />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-1/4" />
      </div>
      <div className="divide-y divide-slate-100">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="p-4 flex gap-4">
            {[...Array(columns)].map((_, j) => (
              <Skeleton key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatsSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

export function LoadingSpinner({ size = 'md', text = 'Loading...' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className="flex items-center justify-center gap-2">
      <div
        className={`animate-spin rounded-full border-2 border-indigo-600 border-t-transparent ${sizeClasses[size]}`}
      />
      {text && <span className="text-sm text-slate-500">{text}</span>}
    </div>
  );
}

export function ButtonSkeleton({ count = 1 }) {
  return (
    <div className="flex gap-2">
      {[...Array(count)].map((_, i) => (
        <Skeleton key={i} className="h-10 w-24 rounded-lg" />
      ))}
    </div>
  );
}
