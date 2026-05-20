'use client';
import { use } from 'react';
import LessonPlayer from '@/views/lesson/LessonPlayer';
export default function Page({ params }: { params: Promise<{ courseId: string; moduleId: string; lessonId: string }> }) {
  const resolvedParams = use(params);
}
