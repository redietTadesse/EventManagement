import { Link } from 'react-router-dom';
import { InboxStackIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

export default function EmptyState({ icon, title = 'Nothing here yet', description,
  actionText, actionLink, actionOnClick, size = 'default' }) {
  return <div className={`px-5 text-center ${size === 'small' ? 'py-8' : 'py-12'}`}>
    <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
      {icon && typeof icon !== 'string' ? icon : <InboxStackIcon className="h-6 w-6" aria-hidden="true" />}
    </span>
    <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
    {description && <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">{description}</p>}
    {actionText && (actionLink || actionOnClick) && <div className="mt-5">
      {actionLink ? <Link to={actionLink} className="btn-outline">{actionText}<ArrowRightIcon className="h-4 w-4" /></Link>
        : <button type="button" onClick={actionOnClick} className="btn-outline">{actionText}<ArrowRightIcon className="h-4 w-4" /></button>}
    </div>}
  </div>;
}
