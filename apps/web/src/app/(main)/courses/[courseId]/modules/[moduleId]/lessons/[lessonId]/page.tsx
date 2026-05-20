'use client';
import { use } from 'react';
import LessonPlayer from '@/features/lesson/views/lesson/LessonPlayer';
export default function Page({ params }: { params: Promise<{ courseId: string; moduleId: string; lessonId: string }> }) {
  const resolvedParams = use(params);
  return <LessonPlayer />;
}
