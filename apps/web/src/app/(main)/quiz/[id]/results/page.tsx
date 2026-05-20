'use client';
import { use } from 'react';
import QuizResults from '@/views/QuizResults';
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
}
