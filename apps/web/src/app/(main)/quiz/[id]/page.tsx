'use client';
import { use } from 'react';
import QuizDetail from '@/views/QuizDetail';
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
}
