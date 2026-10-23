import { useApp } from '../context/AppContext';
import Toast from './Toast';

export default function ToastContainer() {
  const { state } = useApp();
  const { notifications } = state;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.filter(n => !n.isRead).map(notification => (
        <Toast
          key={notification.id}
          message={notification.message}
          type={notification.type || 'info'}
          onClose={() => {/* Handle closing */}}
        />
      ))}
    </div>
  );
}