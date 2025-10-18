import { create } from 'zustand';
import { Notification } from '../types';
import apiClient from '../api/client';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const response = await apiClient.get<{ results: Notification[] }>('/notifications/');
      const notifications = response.data.results;
      const unreadCount = notifications.filter((n) => !n.read).length;
      set({ notifications, unreadCount, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
    }
  },

  markAsRead: async (id: string) => {
    try {
      await apiClient.patch(`/notifications/${id}/`, { read: true });
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  },

  markAllAsRead: async () => {
    try {
      await apiClient.post('/notifications/mark-all-read/');
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }));
    } catch (error) {
      console.error('Failed to mark all notifications as read', error);
    }
  },
}));
