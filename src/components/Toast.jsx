import { useEffect } from 'react';
import { XMarkIcon, CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

const icons = {
  success: <CheckCircleIcon className="w-5 h-5 text-green-500" />,
  error: <ExclamationCircleIcon className="w-5 h-5 text-red-500" />,
  warning: <ExclamationCircleIcon className="w-5 h-5 text-yellow-500" />,
  info: <InformationCircleIcon className="w-5 h-5 text-blue-500" />,
};

export default function Toast({ message, type = 'info', onClose, duration = 3000 }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200',
  };

  return (
    <div className={`max-w-sm w-full rounded-xl shadow-lg border p-4 animate-slide-up ${bgColors[type]}`}>
      <div className="flex items-start gap-3">
        {icons[type]}
        <p className="text-sm text-gray-700 flex-1">{message}</p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
