'use client';
import { use } from 'react';
import QuizDetail from '@/features/quiz/views/QuizDetail';
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
}
