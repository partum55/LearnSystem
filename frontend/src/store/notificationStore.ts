import { create } from 'zustand';
import { Notification } from '../types';
import { notificationsApi } from '../api/notifications';

interface NotificationDto {
  id: string;
  userId: string;
  sendAt: string;
  channel: string;
  message: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const mapNotification = (n: NotificationDto): Notification => ({
  id: n.id,
  user_id: n.userId,
  type: 'assignment_due',
  title: 'Upcoming deadline',
  message: n.message,
  read: false,
  created_at: n.sendAt,
});

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const response = await notificationsApi.getAll();
      const notifications = (response.data || []).map(mapNotification);
      set({ notifications, unreadCount: notifications.length, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const count = await notificationsApi.getCount();
      set({ unreadCount: count });
    } catch {
      // Keep last known unread count
    }
  },

  markAsRead: async (id: string) => {
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      const unreadCount = notifications.filter((n) => !n.read).length;
      return { notifications, unreadCount };
    });
  },

  markAllAsRead: async () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },
}));
