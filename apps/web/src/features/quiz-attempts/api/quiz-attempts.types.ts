import type { Uuid } from '@/api/types';

export interface QuizAttemptStartDto {
  id: Uuid;
  assignmentId: Uuid;
  attemptNumber: number;
  status: string;
  startedAt: string;
  timeLimitMinutes?: number | null;
}

export interface QuizAttemptSubmitRequest {
  answers: Record<string, unknown>;
}

export interface QuizAttemptReviewDto {
  id: Uuid;
  assignmentId: Uuid;
  attemptNumber: number;
  status: string;
  startedAt: string;
  submittedAt?: string | null;
  answers: Record<string, unknown>;
  autoScore?: number | null;
  finalScore?: number | null;
  correctAnswersVisible: boolean;
}
