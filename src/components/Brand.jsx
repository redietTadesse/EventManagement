import { Link } from 'react-router-dom';

export default function Brand({ light = false, compact = false }) {
  return (
    <Link to="/" className={`inline-flex items-center gap-3 ${light ? 'text-white' : 'text-slate-900'}`} aria-label="AICC home">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${light ? 'bg-white/10 text-emerald-200' : 'bg-indigo-600 text-white'}`}>
        <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none" aria-hidden="true">
          <path d="M5 26V12l11-6 11 6v14M10 26V15m6 11V12m6 14V15M3 26h26" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span><span className="block text-xl font-semibold tracking-[0.1em]">AICC</span>
        {!compact && <span className={`block text-[10px] font-medium tracking-widest uppercase ${light ? 'text-slate-300' : 'text-slate-500'}`}>Event management</span>}
      </span>
    </Link>
  );
}
