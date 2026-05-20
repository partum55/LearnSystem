'use client';
import { use } from 'react';
import LessonBuilder from '@/views/lesson/LessonBuilder';
export default function Page({ params }: { params: Promise<{ courseId: string; moduleId: string; lessonId: string }> }) {
  const resolvedParams = use(params);
}
