export default function EventPageControls({ page, onChange, noun = 'events' }) {
  return <nav aria-label={`${noun} pages`} className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
    <p className="text-xs text-slate-500">{page.total ? (page.current - 1) * 15 + 1 : 0}–{Math.min(page.current * 15, page.total)} of {page.total} {noun} · Newest added first</p>
    <div className="flex items-center gap-3">
      <button className="btn-outline disabled:opacity-40" disabled={page.current === 1} onClick={() => onChange(page.current - 1)}>Previous</button>
      <span>Page {page.current} of {page.pages}</span>
      <button className="btn-outline disabled:opacity-40" disabled={page.current === page.pages} onClick={() => onChange(page.current + 1)}>Next</button>
    </div>
  </nav>;
}
