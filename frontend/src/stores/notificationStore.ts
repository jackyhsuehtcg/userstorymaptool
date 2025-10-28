import { create } from 'zustand';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  title?: string;
  duration?: number; // in milliseconds, 0 = persistent
  timestamp: number;
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (
    message: string,
    type?: NotificationType,
    duration?: number,
    title?: string
  ) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

/**
 * Global notification store for displaying toasts/alerts
 * Auto-removes non-persistent notifications after specified duration
 */
export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],

  addNotification: (message, type = 'info', duration = 5000, title) => {
    const id = `notification-${Date.now()}-${Math.random()}`;
    const notification: Notification = {
      id,
      type,
      message,
      title,
      duration,
      timestamp: Date.now(),
    };

    set((state) => ({
      notifications: [...state.notifications, notification],
    }));

    // Auto-remove after duration (if duration > 0)
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      }, duration);
    }
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  clearAll: () => {
    set({ notifications: [] });
  },
}));

/**
 * Helper functions for common notification types
 */
export const notifySuccess = (message: string, title?: string) => {
  useNotificationStore.getState().addNotification(message, 'success', 5000, title);
};

export const notifyError = (message: string, title?: string) => {
  useNotificationStore.getState().addNotification(message, 'error', 0, title);
};

export const notifyWarning = (message: string, title?: string) => {
  useNotificationStore.getState().addNotification(message, 'warning', 7000, title);
};

export const notifyInfo = (message: string, title?: string) => {
  useNotificationStore.getState().addNotification(message, 'info', 5000, title);
};
