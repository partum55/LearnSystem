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

export interface QuizQuestionActiveDto {
  questionId: Uuid;
  type: string;
  order: number;
  text: string;
  stem: string;
  points: number;
  options: Record<string, unknown>;
  studentAnswer?: unknown | null;
}

export interface QuizAttemptActiveDto {
  id: Uuid;
  assignmentId: Uuid;
  quizTitle: string;
  attemptNumber: number;
  status: string;
  startedAt: string;
  timeLimitMinutes?: number | null;
  remainingSeconds?: number | null;
  questions: QuizQuestionActiveDto[];
}
