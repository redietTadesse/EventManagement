import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Navbar from './Navbar';

export default function Layout({ children, title = 'Events' }) {
  const { state: { currentUser } } = useApp();
  const { pathname } = useLocation();
  useEffect(() => { document.title = `${title} · AICC`; }, [title]);
  useEffect(() => {
    window.scrollTo(0, 0);
    document.getElementById('workspace-content')?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <div className={`app-shell ${currentUser ? 'is-authenticated' : ''}`}>
      <a href="#workspace-content" className="skip-link">Skip to content</a>
      {currentUser && <Navbar title={title} />}
      <div className={currentUser ? 'app-body' : ''}>
        <main id="workspace-content" tabIndex={-1} className="workspace-content">
          {children}
        </main>
        <footer className="workspace-footer">
          <span>Addis International Convention Center</span><span>Addis Ababa · Ethiopia</span>
        </footer>
      </div>
    </div>
  );
}
