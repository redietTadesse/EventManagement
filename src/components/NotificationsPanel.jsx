import React from 'react';
import { useApp } from '../context/AppContext';
import InlineNotification from './InlineNotification';

const NotificationsPanel = ({ limit = 5 }) => {
  const { state, markAllNotificationsRead } = useApp();
  const { currentUser, notifications } = state;
  const myNotifications = notifications.filter(n => n.userId === currentUser?.id);
  const unreadCount = myNotifications.filter(n => !n.isRead).length;

  const markAllRead = () => {
    if (currentUser) {
      markAllNotificationsRead();
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
            <InlineNotification 
              key={n.id} 
              notification={n} 
              onAction={(notification, action) => {
                // Handle quick actions from notifications
                console.log('Quick action:', action, 'for notification:', notification.id);
                // Navigate based on action type
                if (action === 'view' && notification.type === 'ASSIGNMENT') {
                  // Would navigate to assignment detail
                  console.log('Navigate to assignment');
                }
              }}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsPanel;