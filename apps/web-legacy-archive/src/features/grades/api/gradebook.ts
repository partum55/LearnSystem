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
    void courseId;
    return [];
  },

  createCategory: async (payload: {
    courseId: string;
    name: string;
    description?: string;
    weight: number;
    dropLowest?: number;
    position?: number;
  }) => {
    void payload;
    throw new Error('TODO canonical API: gradebook categories are not exposed by /v1.');
  },

  updateCategory: async (
    categoryId: string,
    payload: Partial<Pick<GradebookCategory, 'courseId' | 'name' | 'description' | 'weight' | 'dropLowest' | 'position'>>
  ) => {
    void categoryId;
    void payload;
    throw new Error('TODO canonical API: gradebook categories are not exposed by /v1.');
  },

  deleteCategory: async (categoryId: string) => {
    void categoryId;
    throw new Error('TODO canonical API: gradebook categories are not exposed by /v1.');
  },

  reorderCategories: async (courseId: string, categoryIds: string[]) => {
    void courseId;
    void categoryIds;
    throw new Error('TODO canonical API: gradebook categories are not exposed by /v1.');
  },

  getEntryHistory: async (entryId: string) => {
    void entryId;
    return [];
  },
};

export default gradebookApi;
