export default function SkeletonCard() {
  return (
    <div className="bg-white border border-blue-100 rounded-xl p-6 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="h-5 bg-blue-100 rounded w-2/3 mb-2"></div>
          <div className="h-3 bg-blue-50 rounded w-1/3 mb-3"></div>
          <div className="h-3 bg-blue-50 rounded w-full"></div>
        </div>
        <div className="h-6 w-16 bg-blue-100 rounded-full"></div>
      </div>
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-blue-50">
        <div className="h-3 bg-blue-50 rounded w-24"></div>
        <div className="h-8 bg-blue-100 rounded w-24"></div>
      </div>
    </div>
  );
}

export function SkeletonRow({ isDark }) {
  const shimmer = isDark ? 'bg-gray-700' : 'bg-blue-100';
  return (
    <div className="flex items-center justify-between px-5 py-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full ${shimmer}`} />
        <div>
          <div className={`h-3.5 w-32 rounded ${shimmer} mb-2`} />
          <div className={`h-2.5 w-24 rounded ${shimmer}`} />
        </div>
      </div>
      <div className={`h-5 w-16 rounded-full ${shimmer}`} />
    </div>
  );
}
