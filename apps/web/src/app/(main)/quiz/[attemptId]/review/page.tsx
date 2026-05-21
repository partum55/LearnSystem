'use client';

import { useParams } from 'next/navigation';
import { useQuizAttemptReview } from '@/features/quiz-attempts/hooks/useQuizAttemptQueries';
import { Loading } from '@/components/Loading';

const paramString = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default function QuizAttemptReviewPage() {
  const params = useParams<{ attemptId: string }>();
  const attemptId = paramString(params.attemptId);
  const review = useQuizAttemptReview(attemptId);

  if (review.isLoading) return <Loading label="Loading quiz review" />;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6">
      <h1 className="text-3xl font-semibold">Quiz attempt review</h1>
      <p className="mt-3 text-slate-600">Status: {review.data?.status ?? 'Unavailable'}</p>
      {typeof review.data?.finalScore === 'number' && <p className="mt-2 text-slate-600">Score: {review.data.finalScore}</p>}
    </section>
  );
}
