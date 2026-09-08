import React from 'react';
import { Popover, Transition } from '@headlessui/react';
import { useApp } from '../store/AppContext';
import { BellIcon } from '@heroicons/react/24/outline';
import InlineNotification from './InlineNotification';

const NotificationsBell = () => {
  const { state, dispatch } = useApp();
  const { currentUser, notifications } = state;
  const myNotifications = notifications.filter(n => n.userId === currentUser?.id);
  const unreadCount = myNotifications.filter(n => !n.isRead).length;

  const markAllRead = () => {
    if (currentUser) {
      dispatch({ type: 'MARK_NOTIFICATIONS_READ', payload: { userId: currentUser.id } });
    }
  };

  return (
    <Popover className="relative">
      {({ open }) => (
        <>
          <Popover.Button className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-navy">
            <BellIcon className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose text-[10px] font-bold text-white">
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
            <Popover.Panel className="absolute right-0 mt-2 w-80 rounded-xl bg-white shadow-dropdown border border-slate-200/80 overflow-hidden z-50">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-semibold text-slate-800">Notifications</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-sm text-navy hover:text-navy/80 font-medium">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto p-3 space-y-2">
                {myNotifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-slate-500">No notifications yet</div>
                ) : (
                  myNotifications.slice(0, 8).map(n => (
                    <InlineNotification key={n.id} notification={n} />
                  ))
                )}
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
};

export default NotificationsBell;