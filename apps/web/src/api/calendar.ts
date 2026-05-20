import apiClient from './client';

export interface DeadlineItem {
  id: number;
  courseId: number;
  studentGroupId: number;
  title: string;
  description?: string;
  dueAt: string;
  estimatedEffort?: number;
  type?: string;
}

export interface CalendarDay {
  date: string;
  workloadMinutes: number;
  isOverloaded: boolean;
  deadlines: DeadlineItem[];
}

export interface ConflictItem {
  date: string;
  type: string;
  message: string;
  deadlineIds: number[];
}

export const calendarApi = {
  getMonth: async (studentGroupId: string | number, year: number, month: number) => {
    const response = await apiClient.get<CalendarDay[]>(
      `/calendar/student/${studentGroupId}/month`,
      { params: { year, month } }
    );
    return response.data || [];
  },

  getConflicts: async (studentGroupId: string | number) => {
    const response = await apiClient.get<ConflictItem[]>(`/calendar/student/${studentGroupId}/conflicts`);
    return response.data || [];
  },

  downloadIcs: async (studentGroupId: string | number) => {
    const response = await apiClient.get<Blob>(`/calendar/student/${studentGroupId}/ics`, {
      responseType: 'blob' as const,
    });
    return response;
  },

  getDeadlinesForGroup: async (
    studentGroupId: string | number,
    params?: { from?: string; to?: string }
  ) => {
    const response = await apiClient.get<DeadlineItem[]>(`/deadlines/group/${studentGroupId}`, {
      params,
    });
    return response.data || [];
  },
};

export default calendarApi;
