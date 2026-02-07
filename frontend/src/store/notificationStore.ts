import { create } from 'zustand';
import { Notification } from '../types';
import apiClient from '../api/client';

interface NotificationDto {
  deadlineId: number;
  studentId: number;
  sendAt: string;
  channel: string;
  message: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const mapNotification = (n: NotificationDto): Notification => ({
  id: String(n.deadlineId),
  user_id: String(n.studentId),
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
      const response = await apiClient.get<NotificationDto[]>('/notifications');
      const notifications = (response.data || []).map(mapNotification);
      set({ notifications, unreadCount: notifications.length, isLoading: false });
    } catch {
      set({ isLoading: false });
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
