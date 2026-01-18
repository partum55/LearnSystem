import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,    // 5 minutes - data considered fresh
      gcTime: 30 * 60 * 1000,      // 30 minutes - cache time (renamed from cacheTime in v5)
      retry: 3,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Export query keys for consistency
export const queryKeys = {
  courses: {
    all: ['courses'] as const,
    list: () => [...queryKeys.courses.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.courses.all, 'detail', id] as const,
    enrolled: () => [...queryKeys.courses.all, 'enrolled'] as const,
  },
  users: {
    all: ['users'] as const,
    current: () => [...queryKeys.users.all, 'current'] as const,
    detail: (id: string) => [...queryKeys.users.all, 'detail', id] as const,
    list: () => [...queryKeys.users.all, 'list'] as const,
  },
  assessments: {
    all: ['assessments'] as const,
    list: (courseId: string) => [...queryKeys.assessments.all, 'list', courseId] as const,
    detail: (id: string) => [...queryKeys.assessments.all, 'detail', id] as const,
    assignments: (courseId: string) => [...queryKeys.assessments.all, 'assignments', courseId] as const,
    assignmentDetail: (id: string) => [...queryKeys.assessments.all, 'assignment', id] as const,
    quizzes: (courseId: string) => [...queryKeys.assessments.all, 'quizzes', courseId] as const,
    quizDetail: (id: string) => [...queryKeys.assessments.all, 'quiz', id] as const,
    submissions: (assignmentId: string) => [...queryKeys.assessments.all, 'submissions', assignmentId] as const,
  },
  gradebook: {
    all: ['gradebook'] as const,
    course: (courseId: string) => [...queryKeys.gradebook.all, 'course', courseId] as const,
    student: (studentId: string) => [...queryKeys.gradebook.all, 'student', studentId] as const,
  },
  ai: {
    all: ['ai'] as const,
    generation: (type: string) => [...queryKeys.ai.all, 'generation', type] as const,
    templates: () => [...queryKeys.ai.all, 'templates'] as const,
    usage: {
      all: () => [...queryKeys.ai.all, 'usage'] as const,
      me: () => [...queryKeys.ai.all, 'usage', 'me'] as const,
      user: (userId: string) => [...queryKeys.ai.all, 'usage', 'user', userId] as const,
      remaining: (userId: string) => [...queryKeys.ai.all, 'usage', 'remaining', userId] as const,
      quota: (userId: string) => [...queryKeys.ai.all, 'usage', 'quota', userId] as const,
      summary: () => [...queryKeys.ai.all, 'usage', 'summary'] as const,
      stats: () => [...queryKeys.ai.all, 'usage', 'stats'] as const,
      topUsers: (limit: number) => [...queryKeys.ai.all, 'usage', 'top-users', limit] as const,
    },
  },
};

