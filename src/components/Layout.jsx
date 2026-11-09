import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Navbar from './Navbar';

export default function Layout({ children, title = 'Events' }) {
  const { state: { currentUser } } = useApp();
  const { pathname } = useLocation();
  useEffect(() => { document.title = `${title} · AICC`; }, [title]);
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  return (
    <div className="min-h-screen bg-[#f5f6f4] text-slate-900 antialiased">
      <a href="#workspace-content" className="skip-link">Skip to content</a>
      {currentUser && <Navbar title={title} />}
      <div className={currentUser ? 'lg:ml-60' : ''}>
        <main id="workspace-content" tabIndex={-1} className="workspace-content mx-auto w-full max-w-[1500px] px-4 py-6 outline-none sm:px-7 lg:px-9 lg:py-8">
          {children}
        </main>
        <footer className="mx-auto flex max-w-[1500px] flex-wrap justify-between gap-2 px-4 pb-6 pt-4 text-[11px] text-slate-500 sm:px-7 lg:px-9">
          <span>AICC · Event management</span><span>Addis Ababa, Ethiopia</span>
        </footer>
      </div>
    </div>
  );
}
