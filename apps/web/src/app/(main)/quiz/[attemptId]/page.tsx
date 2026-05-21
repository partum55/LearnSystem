'use client';

import { useParams } from 'next/navigation';
import { QuizAttemptPage } from '@/features/quiz-attempts/components/QuizAttemptPage';

export default function QuizAttemptActivePage() {
  const params = useParams<{ attemptId: string }>();
  const attemptId = params.attemptId;

  if (!attemptId) return null;

  return <QuizAttemptPage attemptId={attemptId} />;
}
