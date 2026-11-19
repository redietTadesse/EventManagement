import { Link } from 'react-router-dom';
import { ArrowUpRightIcon } from '@heroicons/react/24/outline';

export default function WorkspaceIntro({ label, title, description, focusLabel, focusTitle, focusNote, href, action, children }) {
  return <section className="overview-intro" aria-label={label}>
    <div className="overview-intro-copy">
      <p className="eyebrow">{label}</p>
      <h1>{title}</h1><p className="intro-description">{description}</p>
      {children && <div className="overview-actions">{children}</div>}
    </div>
    {focusTitle && <div className="overview-focus">
      <p className="eyebrow">{focusLabel}</p>
      <h2>{focusTitle}</h2><p>{focusNote}</p>
      {href && <Link to={href} className="intro-link">{action}<ArrowUpRightIcon className="h-4 w-4" aria-hidden="true" /></Link>}
    </div>}
  </section>;
}
