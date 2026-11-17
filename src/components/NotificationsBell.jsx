import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Popover } from '@headlessui/react';
import { ArrowUpRightIcon, BellIcon } from '@heroicons/react/24/outline';
import { useApp } from '../context/AppContext';
import api from '../api/axios';

export default function NotificationsBell() {
  const { state: { currentUser } } = useApp();
  const userId = currentUser?.id;
  const [inbox, setInbox] = useState(null);
  const [error, setError] = useState('');
  const [marking, setMarking] = useState(false);

  const load = useCallback(async (signal) => {
    try {
      const { data } = await api.get('/notifications', { signal });
      if (!signal?.aborted) {
        setInbox({ ...data, userId });
        setError('');
      }
    } catch {
      if (!signal?.aborted) setError('Could not load notifications. Try again.');
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    const refresh = () => { if (document.visibilityState === 'visible') load(controller.signal); };
    refresh();
    const timer = window.setInterval(refresh, 20000);
    window.addEventListener('focus', refresh);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [userId, load]);

  const data = inbox?.userId === userId ? inbox : null;
  const unread = data?.unreadCount ?? 0;
  async function markRead(id) {
    setMarking(true);
    try {
      await api.patch(id == null ? '/notifications/read-all' : `/notifications/${id}/read`);
      await load();
    } catch {
      setError('Could not mark the notification as read.');
    } finally {
      setMarking(false);
    }
  }

  return <Popover className="relative">
    {({ close }) => <>
      <Popover.Button aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100">
        <BellIcon className="h-6 w-6" aria-hidden="true" />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-rose-700 px-1 text-[10px] font-semibold text-white">{unread > 9 ? '9+' : unread}</span>}
      </Popover.Button>
      <Popover.Panel className="absolute right-0 z-50 mt-2 w-[min(23rem,calc(100vw-5rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <h2 className="font-semibold text-slate-900">Notifications</h2>
          {unread > 0 && <button type="button" disabled={marking} onClick={() => markRead()} className="text-xs font-medium text-indigo-700 underline">Mark all as read</button>}
        </div>
        {error && <p role="alert" className="px-4 py-3 text-sm text-rose-700">{error}{' '}
          <button type="button" className="underline" onClick={() => load()}>Retry</button></p>}
        {!data && !error && <p role="status" className="px-4 py-6 text-sm text-slate-600">Loading notifications…</p>}
        {data?.items.length === 0 && <p className="px-4 py-6 text-sm text-slate-600">No notifications yet.</p>}
        {data?.items.length > 0 && <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
          {data.items.map(item => <li key={item.id} className={`px-4 py-3 ${item.read ? '' : 'bg-indigo-50/60'}`}>
            <div className="flex items-start gap-2">
              {!item.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-600" aria-label="Unread" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.message}</p>
                {item.path && <Link to={item.path} onClick={() => {
                  if (!item.read) markRead(item.id);
                  close();
                }} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-indigo-700 hover:underline">
                  View details <ArrowUpRightIcon className="h-3 w-3" aria-hidden="true" />
                </Link>}
              </div>
            </div>
          </li>)}
        </ul>}
      </Popover.Panel>
    </>}
  </Popover>;
}
