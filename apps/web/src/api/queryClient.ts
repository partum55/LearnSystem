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

export const queryKeys = {
  dashboard: {
    all: ['dashboard'] as const,
    student: () => [...queryKeys.dashboard.all, 'student'] as const,
  },
  courses: {
    all: ['courses'] as const,
    myActive: () => [...queryKeys.courses.all, 'my-active'] as const,
    myTeaching: () => [...queryKeys.courses.all, 'my-teaching'] as const,
    adminList: (params?: unknown) => [...queryKeys.courses.all, 'admin', params ?? {}] as const,
    detail: (id: string) => [...queryKeys.courses.all, id] as const,
    overview: (id: string) => [...queryKeys.courses.detail(id), 'overview'] as const,
    settings: (id: string) => [...queryKeys.courses.detail(id), 'settings'] as const,
    modules: (id: string) => [...queryKeys.courses.detail(id), 'modules'] as const,
    members: (id: string, params?: unknown) => [...queryKeys.courses.detail(id), 'members', params ?? {}] as const,
  },
  users: {
    all: ['users'] as const,
    me: () => [...queryKeys.users.all, 'me'] as const,
    adminList: (params?: unknown) => [...queryKeys.users.all, 'admin', params ?? {}] as const,
  },
  ai: {
    all: ['ai'] as const,
    settings: () => [...queryKeys.ai.all, 'settings'] as const,
  },
  learningItems: {
    all: ['learning-items'] as const,
    detail: (id: string) => [...queryKeys.learningItems.all, 'detail', id] as const,
    blocks: (id: string) => [...queryKeys.learningItems.detail(id), 'blocks'] as const,
  },
  assignments: {
    all: ['assignments'] as const,
    detail: (id: string) => [...queryKeys.assignments.all, id] as const,
    submissions: (assignmentId: string) => [...queryKeys.assignments.detail(assignmentId), 'submissions'] as const,
  },
  gradebook: {
    all: ['gradebook'] as const,
    studentCourse: (courseId: string) => [...queryKeys.gradebook.all, 'student-course', courseId] as const,
    teacherCourse: (courseId: string) => [...queryKeys.gradebook.all, 'teacher-course', courseId] as const,
  },
  quizAttempts: {
    all: ['quiz-attempts'] as const,
    active: (attemptId: string) => [...queryKeys.quizAttempts.all, 'active', attemptId] as const,
    review: (attemptId: string) => [...queryKeys.quizAttempts.all, 'review', attemptId] as const,
  },
};
