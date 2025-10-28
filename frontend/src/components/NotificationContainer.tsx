import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faXmarkCircle, faExclamationCircle, faInfoCircle, faTimes } from '@fortawesome/free-solid-svg-icons';
import type { Notification, NotificationType } from '../stores/notificationStore';
import { useNotificationStore } from '../stores/notificationStore';
import './NotificationContainer.scss';

/**
 * Individual Toast Component
 */
const Toast: React.FC<{
  notification: Notification;
  onRemove: (id: string) => void;
}> = ({ notification, onRemove }) => {
  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return faCheckCircle;
      case 'error':
        return faXmarkCircle;
      case 'warning':
        return faExclamationCircle;
      case 'info':
        return faInfoCircle;
      default:
        return faInfoCircle;
    }
  };

  return (
    <div className={`toast toast-${notification.type}`} role="alert">
      <div className="toast-content">
        <FontAwesomeIcon icon={getIcon(notification.type)} className="toast-icon" />
        <div className="toast-message">
          {notification.title && (
            <div className="toast-title">{notification.title}</div>
          )}
          <div className="toast-text">{notification.message}</div>
        </div>
      </div>
      {notification.duration !== 0 && (
        <div className="toast-progress">
          <div
            className="toast-progress-bar"
            style={{
              animationDuration: `${notification.duration}ms`,
            }}
          />
        </div>
      )}
      <button
        className="toast-close"
        onClick={() => onRemove(notification.id)}
        aria-label="Close"
      >
        <FontAwesomeIcon icon={faTimes} />
      </button>
    </div>
  );
};

/**
 * Notification Container Component
 * Renders all active notifications as toasts
 */
export const NotificationContainer: React.FC = () => {
  const notifications = useNotificationStore((state) => state.notifications);
  const removeNotification = useNotificationStore((state) => state.removeNotification);

  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <Toast
          key={notification.id}
          notification={notification}
          onRemove={removeNotification}
        />
      ))}
    </div>
  );
};
