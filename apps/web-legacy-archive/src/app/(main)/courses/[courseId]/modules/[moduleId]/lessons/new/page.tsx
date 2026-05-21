'use client';
import { use } from 'react';
import LessonBuilder from '@/features/lesson/views/lesson/LessonBuilder';
export default function Page({ params }: { params: Promise<{ courseId: string; moduleId: string }> }) {
  const resolvedParams = use(params);
}
