import { ExclamationTriangleIcon, ClockIcon, InformationCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

const bannerConfig = {
  critical: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    headerBg: 'bg-rose-100',
    icon: <ExclamationTriangleIcon className="h-5 w-5 text-rose-600" />,
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    titleColor: 'text-rose-800',
    countColor: 'text-rose-600',
    itemBg: 'bg-white',
    itemBorder: 'border-rose-200',
    itemHover: 'hover:bg-rose-50',
    itemColor: 'text-rose-700',
    linkColor: 'text-rose-600',
    linkHover: 'hover:text-rose-700',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    headerBg: 'bg-amber-100',
    icon: <ClockIcon className="h-5 w-5 text-amber-600" />,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    titleColor: 'text-amber-800',
    countColor: 'text-amber-600',
    itemBg: 'bg-white',
    itemBorder: 'border-amber-200',
    itemHover: 'hover:bg-amber-50',
    itemColor: 'text-amber-700',
    linkColor: 'text-amber-600',
    linkHover: 'hover:text-amber-700',
  },
  info: {
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    headerBg: 'bg-sky-100',
    icon: <InformationCircleIcon className="h-5 w-5 text-sky-600" />,
    iconBg: 'bg-sky-100',
    iconColor: 'text-sky-600',
    titleColor: 'text-sky-800',
    countColor: 'text-sky-600',
    itemBg: 'bg-white',
    itemBorder: 'border-sky-200',
    itemHover: 'hover:bg-sky-50',
    itemColor: 'text-sky-700',
    linkColor: 'text-sky-600',
    linkHover: 'hover:text-sky-700',
  },
};

export default function ActionBanner({
  type = 'critical',
  count = 0,
  description = '',
  items = [],
  onReview,
  onViewAll,
  reviewText = 'Review',
  viewAllText = 'View all',
}) {
  if (count === 0) return null;

  const config = bannerConfig[type] || bannerConfig.critical;

  return (
    <div className={`${config.bg} border ${config.border} rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden`}>
      <div className={`px-4 py-3 md:px-6 md:py-4 border-b ${config.border} ${config.headerBg}`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            {config.icon}
            <h3 className={`font-semibold ${config.titleColor} text-sm md:text-base`}>
              Action Required - {count} {count === 1 ? 'item' : 'items'} need attention
            </h3>
          </div>
          {onReview && (
            <button
              onClick={onReview}
              className={`text-sm font-medium ${config.linkColor} ${config.linkHover}`}
            >
              {reviewText}
            </button>
          )}
        </div>
      </div>

      <div className="p-3 md:p-4 space-y-3">
        {items.slice(0, 3).map((item, index) => (
          <div
            key={item.id || index}
            className={`${config.itemBg} rounded-lg border ${config.itemBorder} p-3`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg ${config.iconBg} ${config.iconColor} flex items-center justify-center flex-shrink-0`}>
                  {config.icon}
                </div>
                <span className={`font-medium ${config.itemColor} text-sm`}>
                  {item.title || item.name || item.eventName || item.clientName}
                </span>
              </div>
              {item.link && (
                <Link
                  to={item.link}
                  className={`text-xs ${config.linkColor} ${config.linkHover} font-medium`}
                >
                  View →
                </Link>
              )}
            </div>
            {item.description && (
              <p className={`text-xs ${config.itemColor} opacity-80`}>
                {item.description}
              </p>
            )}
          </div>
        ))}

        {items.length > 3 && (
          <div className="text-xs text-slate-500 px-2">
            +{items.length - 3} more
          </div>
        )}

        {onViewAll && items.length > 0 && (
          <div className="pt-2">
            <button
              onClick={onViewAll}
              className={`text-xs ${config.linkColor} ${config.linkHover} font-medium`}
            >
              {viewAllText} {items.length} →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
