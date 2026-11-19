export default function PageHeader({ title, subtitle, action, eyebrow }) {
  return (
    <header className="page-heading">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1>{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </header>
  );
}
