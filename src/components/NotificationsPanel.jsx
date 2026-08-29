import React from 'react';
import { useApp } from '../store/AppContext';
import InlineNotification from './InlineNotification';

const NotificationsPanel = ({ limit = 5 }) => {
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
    <div className="card mt-8">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-slate-800">Recent Notifications</h3>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-sm text-navy hover:text-navy/80 font-medium">
            Mark all read ({unreadCount})
          </button>
        )}
      </div>
      <div className="space-y-2">
        {myNotifications.length === 0 ? (
          <p className="py-4 text-sm text-slate-500">No notifications</p>
        ) : (
          myNotifications.slice(0, limit).map(n => (
            <InlineNotification key={n.id} notification={n} />
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsPanel;