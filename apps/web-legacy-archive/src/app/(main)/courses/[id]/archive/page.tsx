'use client';
import { use } from 'react';
import CourseArchive from '@/features/courses/views/CourseArchive';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  return (
      <CourseArchive />
  );
}
