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

const READ_IDS_KEY = 'notification_read_ids';

const loadReadIds = (): string[] => {
  try {
    const raw = localStorage.getItem(READ_IDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveReadIds = (ids: string[]) => {
  try {
    // Keep only the last 500 IDs to avoid unbounded growth
    localStorage.setItem(READ_IDS_KEY, JSON.stringify(ids.slice(-500)));
  } catch {
    // localStorage full or unavailable
  }
};

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  wsConnected: boolean;
  readIds: string[];
  fetchNotifications: (options?: { force?: boolean }) => Promise<void>;
  fetchUnreadCount: (options?: { force?: boolean }) => Promise<void>;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addRealtimeNotification: (notification: Notification) => void;
  setWsConnected: (connected: boolean) => void;
}

const NOTIFICATIONS_TTL_MS = 60_000;
const UNREAD_COUNT_TTL_MS = 20_000;

let lastNotificationsFetchAt = 0;
let notificationsInFlight: Promise<void> | null = null;

let lastUnreadCountFetchAt = 0;
let unreadCountInFlight: Promise<void> | null = null;

const mapNotification = (n: NotificationDto, readIds: string[]): Notification => ({
  id: n.id,
  userId: n.userId,
  type: 'assignment_due',
  title: 'Upcoming deadline',
  message: n.message,
  read: readIds.includes(n.id),
  createdAt: n.sendAt,
});

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  wsConnected: false,
  readIds: loadReadIds(),

  fetchNotifications: async (options) => {
    const force = options?.force ?? false;
    const isFresh = Date.now() - lastNotificationsFetchAt < NOTIFICATIONS_TTL_MS;

    if (!force && isFresh) {
      return;
    }

    if (notificationsInFlight) {
      return notificationsInFlight;
    }

    const request = (async () => {
      set({ isLoading: true });
      try {
        const response = await notificationsApi.getAll();
        const { readIds } = get();
        const notifications = (response.data || []).map((n) => mapNotification(n, readIds));
        const unreadCount = notifications.filter((n) => !n.read).length;
        lastNotificationsFetchAt = Date.now();
        set({ notifications, unreadCount, isLoading: false });
      } catch {
        set({ isLoading: false });
      } finally {
        notificationsInFlight = null;
      }
    })();

    notificationsInFlight = request;
    return request;
  },

  fetchUnreadCount: async (options) => {
    const force = options?.force ?? false;
    const isFresh = Date.now() - lastUnreadCountFetchAt < UNREAD_COUNT_TTL_MS;

    if (!force && isFresh) {
      return;
    }

    if (unreadCountInFlight) {
      return unreadCountInFlight;
    }

    const request = (async () => {
      try {
        const count = await notificationsApi.getCount();
        // Adjust count by subtracting locally-read notifications
        const { notifications, readIds } = get();
        if (notifications.length > 0) {
          const unreadCount = notifications.filter((n) => !readIds.includes(n.id) && !n.read).length;
          set({ unreadCount });
        } else {
          set({ unreadCount: count });
        }
        lastUnreadCountFetchAt = Date.now();
      } catch {
        // Keep last known unread count
      } finally {
        unreadCountInFlight = null;
      }
    })();

    unreadCountInFlight = request;
    return request;
  },

  markAsRead: (id: string) => {
    set((state) => {
      const readIds = state.readIds.includes(id) ? state.readIds : [...state.readIds, id];
      saveReadIds(readIds);
      const notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      const unreadCount = notifications.filter((n) => !n.read).length;
      return { notifications, unreadCount, readIds };
    });
  },

  markAllAsRead: () => {
    set((state) => {
      const allIds = state.notifications.map((n) => n.id);
      const readIds = Array.from(new Set([...state.readIds, ...allIds]));
      saveReadIds(readIds);
      return {
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
        readIds,
      };
    });
  },

  addRealtimeNotification: (notification: Notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },

  setWsConnected: (connected: boolean) => {
    set({ wsConnected: connected });
  },
}));
