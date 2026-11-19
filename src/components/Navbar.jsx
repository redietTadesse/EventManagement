import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Dialog, Menu } from '@headlessui/react';
import { ArrowRightStartOnRectangleIcon, Bars3Icon, XMarkIcon, Squares2X2Icon, InboxStackIcon, CalendarDaysIcon, BuildingOffice2Icon, UsersIcon, ClipboardDocumentListIcon, PlusIcon, ChevronDownIcon, ChevronRightIcon, ExclamationTriangleIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useApp } from '../context/AppContext';
import NotificationsBell from './NotificationsBell';
import Brand from './Brand';
import api from '../api/axios';

const navigation = {
  CLIENT: [
    ['My workspace', [['/client/dashboard', 'Overview', Squares2X2Icon], ['/client/inquiries', 'My event plans', InboxStackIcon], ['/client/events', 'My events', CalendarDaysIcon]]],
    ['Plan with AICC', [['/client/venues', 'Explore venues', BuildingOffice2Icon]]],
  ],
  COORDINATOR: [
    ['Daily work', [['/coordinator/dashboard', 'Overview', Squares2X2Icon], ['/coordinator/inquiries', 'Client inquiries', InboxStackIcon], ['/coordinator/events', 'Events', ClipboardDocumentListIcon], ['/coordinator/incident-reviews', 'Incident reviews', ExclamationTriangleIcon]]],
    ['Plan & coordinate', [['/coordinator/venue-schedule', 'Venue schedule', BuildingOffice2Icon], ['/coordinator/calendar', 'Event calendar', CalendarDaysIcon], ['/coordinator/availability', 'Vendor availability', UsersIcon]]],
    ['Resources', [['/coordinator/venues', 'Venues', BuildingOffice2Icon], ['/coordinator/vendors', 'Vendors', UsersIcon], ['/coordinator/assistance', 'Updates & follow-ups', SparklesIcon]]],
  ],
  VENDOR: [['My workspace', [['/vendor/dashboard', 'Overview', Squares2X2Icon], ['/vendor/assignments', 'My assignments', ClipboardDocumentListIcon], ['/vendor/open', 'Open requests', InboxStackIcon]]]],
  ADMIN: [
    ['Business', [['/admin/dashboard', 'Management overview', Squares2X2Icon]]],
    ['People & resources', [['/admin/coordinators', 'Coordinators', UsersIcon], ['/admin/vendor-applications', 'Vendor applications', InboxStackIcon], ['/admin/vendors', 'Vendors', ClipboardDocumentListIcon], ['/admin/venues', 'Venues', BuildingOffice2Icon]]],
  ],
};
const roleLabels = { CLIENT: 'Client', COORDINATOR: 'Coordinator', VENDOR: 'Vendor', ADMIN: 'Administration' };
const primary = { CLIENT: ['/client/new-inquiry', 'Plan an event'], COORDINATOR: ['/coordinator/venue-schedule', 'Check venue schedule'], VENDOR: ['/vendor/open', 'Find open requests'], ADMIN: ['/admin/vendor-applications', 'Review applications'] };

export default function Navbar({ title }) {
  const { state: { currentUser }, logout } = useApp();
  const [open, setOpen] = useState(false);
  const [pendingIncidents, setPendingIncidents] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (currentUser?.role !== 'COORDINATOR') return;
    let cancelled = false;
    const refresh = async () => {
      try { const { data } = await api.get('/incidents/pending/count'); if (!cancelled) setPendingIncidents(Number(data) || 0); } catch { /* Keep navigation available when the count cannot load. */ }
    };
    refresh();
    const timer = setInterval(refresh, 60000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [currentUser?.id, currentUser?.role, location.pathname]);
  if (!currentUser) return null;
  const groups = navigation[currentUser.role] || [];
  const links = groups.flatMap(([, items]) => items);
  const role = roleLabels[currentUser.role] || 'Workspace';
  const name = currentUser.fullName || currentUser.name || currentUser.username || 'Account';
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase();
  const active = links.find(([path]) => location.pathname === path || location.pathname.startsWith(`${path}/`));
  const action = primary[currentUser.role];
  const signOut = () => { logout(); setOpen(false); navigate('/'); };
  const renderSidebar = () => <>
    <div className="nav-brand"><Brand light /><span className="nav-edition">{role} workspace</span></div>
    {action && <Link to={action[0]} className="nav-primary" onClick={() => setOpen(false)}><PlusIcon aria-hidden="true" />{action[1]}</Link>}
    <nav aria-label="Main navigation" className="nav-groups">{groups.map(([label, items]) => <div key={label} className="nav-group"><p>{label}</p>{items.map(([path, text, Icon]) => <NavLink key={path} to={path} end={path.endsWith('/dashboard')} onClick={() => setOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'is-active' : ''}`}><Icon aria-hidden="true" /><span>{text}</span>{path === "/coordinator/incident-reviews" && pendingIncidents > 0 && <span className="ml-auto rounded bg-rose-100 px-1.5 py-0.5 text-xs text-rose-900" aria-label={`${pendingIncidents} pending reports`}>{pendingIncidents}</span>}<ChevronRightIcon className="nav-item-arrow" aria-hidden="true" /></NavLink>)}</div>)}</nav>
    <div className="nav-bottom"><div className="nav-place"><BuildingOffice2Icon aria-hidden="true" /><span>Addis International<br /><strong>Convention Center</strong></span></div><button type="button" onClick={signOut}><ArrowRightStartOnRectangleIcon aria-hidden="true" />Sign out</button></div>
  </>;

  return <>
    <aside className="workspace-sidebar">{renderSidebar()}</aside>
    <Dialog open={open} onClose={setOpen} className="relative z-[70] lg:hidden"><div className="fixed inset-0 bg-slate-950/50" aria-hidden="true" /><Dialog.Panel className="workspace-sidebar is-mobile"><Dialog.Title className="sr-only">Workspace navigation</Dialog.Title><button type="button" aria-label="Close navigation" onClick={() => setOpen(false)} className="nav-close"><XMarkIcon /></button>{renderSidebar()}</Dialog.Panel></Dialog>
    <header className="workspace-topbar">
      <div className="topbar-context"><button type="button" aria-label="Open navigation" aria-expanded={open} onClick={() => setOpen(true)} className="topbar-menu"><Bars3Icon /></button><nav aria-label="Breadcrumb" className="workspace-breadcrumb"><Link to={links[0]?.[0] || '/'}>{role}</Link><ChevronRightIcon aria-hidden="true" />{active && active[1] !== title ? <><Link to={active[0]}>{active[1]}</Link><ChevronRightIcon aria-hidden="true" /></> : null}<span aria-current="page">{title || active?.[1] || 'Workspace'}</span></nav></div>
      <div className="topbar-account"><NotificationsBell /><span className="account-divider" /><Menu as="div" className="relative"><Menu.Button className="account-button"><span className="account-avatar">{initials}</span><span className="account-name"><strong>{name}</strong><small>{role}</small></span><ChevronDownIcon className="h-4 w-4" aria-hidden="true" /><span className="sr-only">Account menu</span></Menu.Button><Menu.Items className="account-menu"><div className="account-menu-identity"><strong>{name}</strong><span>{role} workspace</span></div><Menu.Item>{({ active: focused }) => <button type="button" className={focused ? 'is-focused' : ''} onClick={signOut}><ArrowRightStartOnRectangleIcon />Sign out</button>}</Menu.Item></Menu.Items></Menu></div>
    </header>
    <nav aria-label="Quick navigation" className="mobile-dock">{links.slice(0, 3).map(([path, text, Icon]) => <NavLink key={path} to={path} end={path.endsWith('/dashboard')}><Icon aria-hidden="true" /><span>{text}</span></NavLink>)}<button type="button" onClick={() => setOpen(true)} aria-expanded={open}><Bars3Icon aria-hidden="true" /><span>Menu</span></button></nav>
  </>;
}
