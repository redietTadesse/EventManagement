export default function LoadingSpinner({ size = 'md', fullPage = false }) {
  const sizes = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const spinner = (
    <div className="flex items-center justify-center gap-2">
      <div className={`${sizes[size]} border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin`} />
      <span className="text-sm text-gray-500">Loading...</span>
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
}
