'use client';
import { use } from 'react';
import QuizTaking from '@/views/QuizTaking';
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
}
