import apiClient from './client';

export interface NotificationItem {
  id: string;
  userId: string;
  message: string;
  channel: string;
  sendAt: string;
  read: boolean;
}

interface NotificationDto {
  deadlineId: number;
  studentId: number;
  sendAt: string;
  channel: string;
  message: string;
}

const mapNotification = (dto: NotificationDto): NotificationItem => ({
  id: String(dto.deadlineId),
  userId: String(dto.studentId),
  message: dto.message,
  channel: dto.channel,
  sendAt: dto.sendAt,
  read: false,
});

export const notificationsApi = {
  getAll: async () => {
    const response = await apiClient.get<NotificationDto[]>('/notifications');
    const items = Array.isArray(response.data) ? response.data.map(mapNotification) : [];
    return { ...response, data: items };
  },

  getCount: async () => {
    const response = await apiClient.get<number>('/notifications/count');
    return Number(response.data || 0);
  },
};

export default notificationsApi;
