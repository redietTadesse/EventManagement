import { Link } from 'react-router-dom';

export default function EmptyState({
  icon = '📭',
  title = 'Nothing here yet',
  description = 'Start by adding your first item.',
  actionText,
  actionLink,
  actionOnClick,
  size = 'default'
}) {
  const sizeClasses = {
    small: 'py-8',
    default: 'py-12',
    large: 'py-16',
  };

  const iconSizes = {
    small: 'text-4xl',
    default: 'text-5xl',
    large: 'text-6xl',
  };

  return (
    <div className={`text-center px-4 ${sizeClasses[size]}`}>
      <div className={`${iconSizes[size]} mb-4 animate-pulse`}>{icon}</div>
      <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">{description}</p>
      {(actionText && (actionLink || actionOnClick)) && (
        <div className="mt-4">
          {actionLink ? (
            <Link
              to={actionLink}
              className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors hover:underline"
            >
              {actionText}
              <span>→</span>
            </Link>
          ) : (
            <button
              onClick={actionOnClick}
              className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors hover:underline"
            >
              {actionText}
              <span>→</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
