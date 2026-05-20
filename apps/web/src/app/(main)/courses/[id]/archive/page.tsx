'use client';
import { use } from 'react';
import CourseArchive from '@/views/CourseArchive';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  return (
      <CourseArchive />
  );
}
