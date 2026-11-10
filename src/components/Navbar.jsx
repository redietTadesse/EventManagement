
import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Dialog } from '@headlessui/react';
import {
  ArrowRightStartOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  Squares2X2Icon,
  InboxStackIcon,
  CalendarDaysIcon,
  BuildingOffice2Icon,
  UsersIcon,
  ClipboardDocumentListIcon,
  PlusCircleIcon,
} from '@heroicons/react/24/outline';

import { useApp } from '../context/AppContext';
import NotificationsBell from './NotificationsBell';
import Brand from './Brand';

const navigation = {
  CLIENT: [
    ['/client/dashboard', 'Overview', Squares2X2Icon],
    ['/client/inquiries', 'My inquiries', InboxStackIcon],
    ['/client/events', 'My events', CalendarDaysIcon],
    ['/client/venues', 'Find a venue', BuildingOffice2Icon],
    ['/client/new-inquiry', 'Plan an event', PlusCircleIcon],
  ],
  COORDINATOR: [
    ['/coordinator/dashboard', 'Overview', Squares2X2Icon],
    ['/coordinator/inquiries', 'Inquiries', InboxStackIcon],
    ['/coordinator/events', 'Events', ClipboardDocumentListIcon],
    ['/coordinator/calendar', 'Calendar', CalendarDaysIcon],
    ['/coordinator/vendors', 'Vendor directory', UsersIcon],
    ['/coordinator/venues', 'Venues', BuildingOffice2Icon],
    ['/coordinator/availability', 'Availability', CalendarDaysIcon],
  ],
  VENDOR: [
    ['/vendor/dashboard', 'Overview', Squares2X2Icon],
    ['/vendor/assignments', 'My assignments', ClipboardDocumentListIcon],
    ['/vendor/open', 'Open requests', InboxStackIcon],
  ],
  ADMIN: [
    ['/admin/dashboard', 'Management overview', Squares2X2Icon],
    ['/admin/coordinators', 'Coordinators', UsersIcon],
    ['/admin/vendors', 'Vendor management', ClipboardDocumentListIcon],
    ['/admin/venues', 'Venue management', BuildingOffice2Icon],
  ],
};

const roleLabels = {
  CLIENT: 'Client workspace',
  COORDINATOR: 'Coordinator workspace',
  VENDOR: 'Vendor workspace',
  ADMIN: 'Administration',
};

export default function Navbar({ title }) {
  const {
    state: { currentUser },
    logout,
  } = useApp();

  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  if (!currentUser) {
    return null;
  }

  const links = navigation[currentUser.role] || [];
  const roleLabel = roleLabels[currentUser.role] || 'Workspace';

  const name =
    currentUser.fullName ||
    currentUser.username ||
    'Account';

  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase();

  const active = links.find(
    ([path]) =>
      location.pathname === path ||
      location.pathname.startsWith(`${path}/`)
  );

  const signOut = () => {
    logout();
    setOpen(false);
    navigate('/');
  };

  const renderSidebar = () => (
    <>
      <div className="px-6 pb-9 pt-7">
        <Brand light />
      </div>

      <p className="px-6 pb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {roleLabel}
      </p>

      <nav
        aria-label="Main navigation"
        className="space-y-1 px-3"
      >
        {links.map(([path, label, Icon]) => (
          <NavLink
            key={path}
            to={path}
            end={path.endsWith('/dashboard')}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white/12 text-white ring-1 ring-inset ring-white/10'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <Icon
              className="h-5 w-5 shrink-0"
              aria-hidden="true"
            />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto p-5">
        <div className="mb-5 border-t border-white/10 pt-5 text-xs leading-relaxed text-slate-400">
          Addis International
          <br />
          Convention Center
        </div>

        <button
          type="button"
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ArrowRightStartOnRectangleIcon
            className="h-5 w-5"
            aria-hidden="true"
          />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-[#142f32] lg:flex">
        {renderSidebar()}
      </aside>

      {/* Mobile sidebar */}
      <Dialog
        open={open}
        onClose={setOpen}
        className="relative z-[70] lg:hidden"
      >
        <div
          className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm"
          aria-hidden="true"
        />

        <Dialog.Panel className="fixed inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto bg-[#142f32]">
          <Dialog.Title className="sr-only">
            Workspace navigation
          </Dialog.Title>

          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="absolute right-3 top-3 rounded-lg p-2 text-slate-300 hover:bg-white/10"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>

          {renderSidebar()}
        </Dialog.Panel>
      </Dialog>

      {/* Main header */}
      <header className="sticky top-0 z-30 flex min-h-[72px] items-center justify-between gap-3 border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md sm:px-7 lg:ml-60 lg:px-9">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            aria-label="Open navigation"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>

          <div className="min-w-0 text-sm">
            <span className="hidden text-slate-500 sm:inline">
              {roleLabel}
              <span className="mx-3 text-slate-300">/</span>
            </span>

            <span className="font-medium text-slate-800">
              {active?.[1] || title || 'Workspace'}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <NotificationsBell />

          <div className="hidden border-l border-slate-200 pl-4 text-right sm:block">
            <p className="max-w-40 truncate text-sm font-semibold text-slate-800">
              {name}
            </p>

            <p className="text-xs text-slate-500">
              {currentUser.role.toLowerCase()}
            </p>
          </div>

          <span
            title={name}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-indigo-100 bg-indigo-50 text-xs font-semibold text-indigo-700"
          >
            {initials}
          </span>
        </div>
      </header>
    </>
  );
}
