import apiClient from './client';

export interface PlatformUsage {
  totalUsers?: number;
  activeUsers?: number;
  totalInstructors?: number;
  totalStudents?: number;
  totalCourses?: number;
  activeCourses?: number;
  totalEnrollments?: number;
  totalAssignments?: number;
  totalQuizzes?: number;
  totalSubmissions?: number;
  usersByRole?: Record<string, number>;
  coursesByStatus?: Record<string, number>;
  engagementMetrics?: Record<string, number>;
}

export interface CourseEffectiveness {
  courseId: number;
  courseCode?: string;
  courseTitle?: string;
  totalStudents?: number;
  activeStudents?: number;
  completionRate?: number;
  averageGrade?: number;
  passRate?: number;
  totalAssignments?: number;
  totalQuizzes?: number;
  averageSubmissionRate?: number;
  studentSatisfaction?: number;
  status?: string;
}

export interface InstructorProductivity {
  instructorId: number;
  instructorName?: string;
  coursesTeaching?: number;
  totalStudents?: number;
  contentItemsCreated?: number;
  averageGradingTime?: number;
  assignmentsGraded?: number;
  assignmentsPending?: number;
  responseTime?: number;
  studentSatisfaction?: number;
  activeDays?: number;
}

export const adminAnalyticsApi = {
  getPlatformUsage: async () => {
    const response = await apiClient.get<PlatformUsage>('/admin/analytics/platform-usage');
    return response.data;
  },

  getCourseEffectiveness: async () => {
    const response = await apiClient.get<CourseEffectiveness[]>('/admin/analytics/course-effectiveness');
    return response.data || [];
  },

  getInstructorProductivity: async () => {
    const response = await apiClient.get<InstructorProductivity[]>('/admin/analytics/instructor-productivity');
    return response.data || [];
  },
};

export default adminAnalyticsApi;
