import apiClient from './client';

export interface GradebookCategory {
  id: string;
  courseId: string;
  name: string;
  description?: string;
  weight: number;
  dropLowest: number;
  position: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface GradeHistoryItem {
  id: string;
  gradebookEntryId: string;
  previousScore?: number;
  newScore?: number;
  reason?: string;
  changedBy?: string;
  changedAt?: string;
}

export const gradebookApi = {
  getCategories: async (courseId: string) => {
    const response = await apiClient.get<GradebookCategory[]>(`/gradebook/categories/course/${courseId}`);
    return response.data || [];
  },

  createCategory: async (payload: {
    courseId: string;
    name: string;
    description?: string;
    weight: number;
    dropLowest?: number;
    position?: number;
  }) => {
    const response = await apiClient.post<GradebookCategory>('/gradebook/categories', payload);
    return response.data;
  },

  updateCategory: async (
    categoryId: string,
    payload: Partial<Pick<GradebookCategory, 'courseId' | 'name' | 'description' | 'weight' | 'dropLowest' | 'position'>>
  ) => {
    const response = await apiClient.put<GradebookCategory>(`/gradebook/categories/${categoryId}`, payload);
    return response.data;
  },

  deleteCategory: async (categoryId: string) => {
    await apiClient.delete(`/gradebook/categories/${categoryId}`);
  },

  getEntryHistory: async (entryId: string) => {
    const response = await apiClient.get<GradeHistoryItem[]>(`/gradebook/entries/${entryId}/history`);
    return response.data || [];
  },
};

export default gradebookApi;
