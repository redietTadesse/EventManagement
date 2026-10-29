import React from 'react';
import { Popover, Transition } from '@headlessui/react';
import { useApp } from '../context/AppContext';
import { BellIcon, CheckIcon } from '@heroicons/react/24/outline';
import InlineNotification from './InlineNotification';

const NotificationsBell = () => {
  const { state, markAllNotificationsRead } = useApp();
  const { currentUser, notifications } = state;
  const myNotifications = notifications.filter(n => n.userId === currentUser?.id);
  const unreadCount = myNotifications.filter(n => !n.isRead).length;

  const markAllRead = () => {
    if (currentUser) {
      markAllNotificationsRead();
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'ASSIGNMENT':
        return '📋';
      case 'PROPOSAL':
        return '📄';
      case 'EVENT':
        return '📅';
      case 'SYSTEM':
        return '⚙️';
      default:
        return '🔔';
    }
  };

  return (
    <Popover className="relative">
      {({ open }) => (
        <>
          <Popover.Button className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors">
            <BellIcon className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Popover.Button>
          <Transition
            as={React.Fragment}
            enter="transition ease-out duration-150"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Popover.Panel className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/80 overflow-hidden z-50">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-800">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="bg-rose-100 text-rose-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
                  >
                    <CheckIcon className="w-3 h-3" />
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {myNotifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="text-4xl mb-3">🔔</div>
                    <p className="text-sm text-slate-500">No notifications yet</p>
                    <p className="text-xs text-slate-400 mt-1">We'll notify you when something happens</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {myNotifications.slice(0, 8).map(n => (
                      <InlineNotification key={n.id} notification={n} />
                    ))}
                  </div>
                )}
              </div>
              {myNotifications.length > 8 && (
                <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                  <button className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                    View all notifications →
                  </button>
                </div>
              )}
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
};

export default NotificationsBell;