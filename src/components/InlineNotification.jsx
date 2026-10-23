import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { CheckIcon, XMarkIcon, EyeIcon } from '@heroicons/react/24/outline';

const InlineNotification = ({ notification }) => {
  const { markNotificationRead, respondToAssignment } = useApp();
  const navigate = useNavigate();

  const markRead = (id) => {
    markNotificationRead(id);
  };

  const handleOpen = () => {
    markRead(notification.id);
    switch (notification.type) {
      case 'ASSIGNMENT':
        if (notification.referenceId) navigate(`/vendor/assignments/${notification.referenceId}`);
        else navigate('/vendor/assignments');
        break;
      case 'PROPOSAL':
        navigate('/client/inquiries');
        break;
      case 'EVENT':
        navigate('/client/inquiries');
        break;
      default:
        navigate('/');
    }
  };

  const handleRespond = async (action) => {
    markRead(notification.id);
    if (!notification.referenceId) {
      navigate('/vendor/assignments');
      return;
    }
    if (action === 'accept') {
      await respondToAssignment(notification.referenceId, 'ACCEPTED');
      navigate(`/vendor/assignments/${notification.referenceId}`);
    } else {
      await respondToAssignment(
        notification.referenceId,
        'DECLINED',
        'Declined directly from notification'
      );
      navigate('/vendor/assignments');
    }
  };

  const getActionButton = () => {
    switch (notification.type) {
      case 'ASSIGNMENT':
        return (
          <div className="flex gap-2">
            <button
              onClick={() => handleRespond('accept')}
              className="flex items-center gap-1 btn-success text-xs py-1 px-2"
            >
              <CheckIcon className="w-3 h-3" />
              Accept
            </button>
            <button
              onClick={() => handleRespond('decline')}
              className="flex items-center gap-1 btn-danger text-xs py-1 px-2"
            >
              <XMarkIcon className="w-3 h-3" />
              Decline
            </button>
          </div>
        );
      case 'PROPOSAL':
        return (
          <button
            onClick={handleOpen}
            className="flex items-center gap-1 btn-primary text-xs py-1 px-2"
          >
            <EyeIcon className="w-3 h-3" />
            View Proposal
          </button>
        );
      case 'EVENT':
        return (
          <button
            onClick={handleOpen}
            className="flex items-center gap-1 btn-primary text-xs py-1 px-2"
          >
            <EyeIcon className="w-3 h-3" />
            View Event
          </button>
        );
      default:
        return (
          <button
            onClick={handleOpen}
            className="flex items-center gap-1 btn-outline text-xs py-1 px-2"
          >
            <EyeIcon className="w-3 h-3" />
            View
          </button>
        );
    }
  };

  return (
    <div className={`p-3 rounded-lg border ${notification.isRead ? 'bg-white border-slate-200' : 'bg-ice/10 border-ice/30'}`}>
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-800 text-sm">{notification.title}</span>
            {!notification.isRead && <span className="w-2 h-2 rounded-full bg-navy" />}
          </div>
          <p className="text-sm text-slate-600 mt-1 line-clamp-2">{notification.message}</p>
          <p className="text-xs text-slate-400 mt-2">
            {new Date(notification.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex-shrink-0">
          {getActionButton()}
        </div>
      </div>
    </div>
  );
};

export default InlineNotification;