import { Component } from 'react';
import { Link, useLocation } from 'react-router-dom';

class Boundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error, info) { console.error('Page rendering failed', error, info); }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="mx-auto max-w-xl space-y-4 px-6 py-16" role="alert">
      <h1 className="text-2xl font-bold text-slate-900">This page could not be displayed</h1>
      <p className="text-slate-600">Refresh the page to try again, or return to your dashboard.</p>
      <div className="flex gap-4"><button onClick={() => window.location.reload()} className="rounded-lg bg-indigo-600 px-4 py-2 text-white">Refresh page</button><Link to="/" className="rounded-lg border px-4 py-2">Dashboard</Link></div>
    </main>;
  }
}

export default function PageErrorBoundary({ children }) {
  const { pathname } = useLocation();
  return <Boundary key={pathname}>{children}</Boundary>;
}
