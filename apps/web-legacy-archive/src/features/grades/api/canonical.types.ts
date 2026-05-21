import type { Uuid } from '@/api/types';

export interface GradebookTotalDto {
  points: number;
  maxPoints: number;
  percentage?: number | null;
}

export interface StudentGradebookDto {
  courseId: Uuid;
  courseTitle: string;
  total: GradebookTotalDto;
  modules: Array<{
    moduleId: Uuid;
    title: string;
    total: GradebookTotalDto;
    assignments: Array<{
      assignmentId: Uuid;
      title: string;
      type: string;
      points?: number | null;
      maxPoints: number;
      status: string;
      comment?: string | null;
    }>;
  }>;
}

export interface TeacherGradebookDto {
  courseId: Uuid;
  students: Array<{
    id: Uuid;
    displayName: string;
    email?: string | null;
    avatarUrl?: string | null;
  }>;
  assignments: Array<{
    id: Uuid;
    moduleId: Uuid;
    title: string;
    type: string;
    maxPoints: number;
    dueDate?: string | null;
  }>;
  grades: Array<{
    studentId: Uuid;
    assignmentId: Uuid;
    submissionId?: Uuid | null;
    draftPoints?: number | null;
    publishedPoints?: number | null;
    maxPoints: number;
    status: string;
    comment?: string | null;
  }>;
}

export interface GradebookCellUpdateRequest {
  cells: Array<{
    studentId: Uuid;
    assignmentId: Uuid;
    points: number;
    comment?: string;
  }>;
}

export interface GradebookPublishRequest {
  assignmentIds: Uuid[];
  studentIds?: Uuid[];
}
