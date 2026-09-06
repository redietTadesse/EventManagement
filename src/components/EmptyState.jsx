import { Link } from 'react-router-dom';

export default function EmptyState({
  icon = '📭',
  title = 'Nothing here yet',
  description = 'Start by adding your first item.',
  actionText,
  actionLink,
  actionOnClick
}) {
  return (
    <div className="text-center py-12 px-4">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">{description}</p>
      {(actionText && (actionLink || actionOnClick)) && (
        <div className="mt-4">
          {actionLink ? (
            <Link to={actionLink} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              {actionText} →
            </Link>
          ) : (
            <button onClick={actionOnClick} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              {actionText} →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
